<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "$lib/trpc/client";

  //export let open = false;
  export let onClose: () => void;

  let activeTab = "account";
  let selectedTheme = "Classic Slate";

  // ==================== STATE ====================
  let user: any = null;
  $: if (user?.avatarUrl && !previewUrl) {
  previewUrl = user.avatarUrl;
}

  let fileInput: HTMLInputElement;
  let previewUrl = "";
  let uploading = false;
  let profile = { name: "", email: "", alias: "" };
  let loadingProfile = false;

  // ==================== LOAD USER & PROFILE ====================
  onMount(async () => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("user");
    if (stored) user = JSON.parse(stored);

    //  Load theme
    const saved = localStorage.getItem("theme");
    if (saved) {
      selectedTheme =
        themes.find((t) => t.name.toLowerCase().replace(/\s+/g, "-") === saved)
          ?.name || selectedTheme;
      applyTheme(selectedTheme);
    }

    //  Load font & font size
    const fontFamily = localStorage.getItem("fontFamily") || "Inter";
    const fontSizeStored = parseInt(localStorage.getItem("fontSize") || "15");
    applyFont(fontFamily, fontSizeStored);

    // Load user profile
    if (user?.token) {
      try {
        loadingProfile = true;
        const res = await trpc.user.getProfile.query({
          token: user.token,
        });
        profile.name = res.username;
        profile.email = res.email;
        profile.alias = res.alias || "";
        user.avatarUrl = res.avatarUrl || "";
        console.log(" [SettingsModal] Loaded profile:", res);
      } catch (err) {
        console.error(" [SettingsModal] Load profile failed:", err);
      } finally {
        loadingProfile = false;
      }
    }
  });

  // ==================== SAVE PROFILE ====================
  async function saveProfile() {
    if (!user) return;
    try {
      let s3Url = "";
      const res = await trpc.user.updateProfile.mutate({
        id: user.id,
        username: profile.name,
        alias: profile.alias,
        email: profile.email,
        avatarUrl: s3Url,
      });
      console.log(" [SettingsModal] Updated profile:", res);
      alert("Cập nhật thành công!");
    } catch (err) {
      console.error(" [SettingsModal] Update failed:", err);
      alert("Cập nhật thất bại!");
    }
  }

  // ==================== UPLOAD AVATAR ====================
  async function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  previewUrl = URL.createObjectURL(file);
  uploading = true;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploaderId", user.id);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/trpc/file.upload`,
      { method: "POST", body: formData }
    );

    const json = await res.json();
    console.log(" Upload response full:", json);

    const s3Url =
      json?.result?.data?.s3Url || 
      json?.result?.data?.url ||
      json?.url;

    if (!s3Url) {
      console.error("Không tìm thấy s3Url trong response:", json);
      return;
    }

    //  Cập nhật preview và user ngay lập tức
    previewUrl = s3Url;
    user.avatarUrl = s3Url;
    localStorage.setItem("user", JSON.stringify(user));

    //  Gọi updateProfile để lưu vào DB
    await trpc.user.updateProfile.mutate({
      id: user.id,
      username: profile.name,
      alias: profile.alias,
      email: profile.email,
      avatarUrl: s3Url,
    });

    console.log(" Avatar URL cập nhật vào DB:", s3Url);

    //  Reload lại user từ backend
    try {
      const res2 = await trpc.user.getProfile.query({ token: user.token });
      user.avatarUrl = res2.avatarUrl;
      previewUrl = res2.avatarUrl;
      localStorage.setItem("user", JSON.stringify(user));
      console.log(" Reloaded profile:", res2);
    } catch (err) {
      console.error(" Lỗi reload profile:", err);
    }
  } catch (err) {
    console.error(" Upload failed:", err);
  } finally {
    uploading = false;
  }
}

  // ==================== THEME ====================
  function getContrastColor(hexColor: string): string {
    const c = hexColor.startsWith("#") ? hexColor.substring(1) : hexColor;
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#111827" : "#f9fafb";
  }

  const themes = [
    { name: "Scarlet", left: "#3a3a3a", right: "#ffffff", dots: "#e11d48" },
    {
      name: "Scarlet Dark",
      left: "#1e1e1e",
      right: "#2b2b2b",
      dots: "#e11d48",
    },
    {
      name: "Scarlet Slate",
      left: "#d1d5db",
      right: "#ffffff",
      dots: "#e11d48",
    },
    { name: "Classic", left: "#3a3a3a", right: "#ffffff", dots: "#111" },
    { name: "Classic Dark", left: "#1e1e1e", right: "#2b2b2b", dots: "#555" },
    { name: "Classic Slate", left: "#e5e7eb", right: "#f9fafb", dots: "#111" },
  ];

  function applyTheme(theme: string) {
    selectedTheme = theme;
    const key = theme.toLowerCase().replace(/\s+/g, "-");
    const current = themes.find((t) => t.name === theme);
    if (!current) return;

    const sidebarTextColor = getContrastColor(current.left);
    const noteTextColor = getContrastColor(current.right);

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--sidebar-bg", current.left);
      document.documentElement.style.setProperty("--note-bg", current.right);
      document.documentElement.style.setProperty(
        "--sidebar-text-color",
        sidebarTextColor
      );
      document.documentElement.style.setProperty(
        "--note-text-color",
        noteTextColor
      );

      document.documentElement.setAttribute("data-theme", key);
      document.body.setAttribute("data-theme", key);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("theme", key);
    }
  }

  // ==================== FONT SETTINGS ====================
  let selectedFont = "Inter";
  let fontSize = 15;
  const fonts = [
    "Inter",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Nunito",
    "Poppins",
    "Source Sans Pro",
  ];

  function applyFont(font: string, size = fontSize) {
    selectedFont = font;
    fontSize = size;

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--app-font", font);
      document.documentElement.style.setProperty(
        "--app-font-size",
        `${size}px`
      );
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("fontFamily", font);
      localStorage.setItem("fontSize", size.toString());
    }
  }
</script>

<!-- ==================== UI ==================== -->


  <div
    class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
  >
    <div
  class="bg-white 
         w-[95vw] max-w-[1100px] 
         h-[90vh] max-h-[700px]
         rounded-xl shadow-2xl 
         flex relative"
>

      <!-- Sidebar -->
      <div class="w-1/3 border-r border-gray-200 p-4 space-y-2 overflow-y-auto">
        {#each [{ id: "account", label: "Account", icon: "⚙️" }, { id: "picture", label: "Profile Picture", icon: "👤" }, { id: "theme", label: "Theme", icon: "🎨" }, { id: "font", label: "Font", icon: "🅰️" }] as tab}
          <button
            class={`flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100 transition ${
              activeTab === tab.id ? "bg-gray-100 font-semibold" : ""
            }`}
            on:click={() => (activeTab = tab.id)}
          >
            <span class="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        {/each}
      </div>

      <!-- Main content -->
      <div class="flex-1 p-6 overflow-y-auto">
        {#if activeTab === "account"}
          <h2 class="text-lg font-semibold mb-4">Account</h2>
          {#if loadingProfile}
            <p class="text-gray-500">Đang tải thông tin...</p>
          {:else}
            <div class="space-y-3">
              <label class="block">
                <span>Name</span>
                <input
                  type="text"
                  class="border rounded-md w-full p-2"
                  bind:value={profile.name}
                />
              </label>

              <label class="block">
                <span>Email</span>
                <input
                  type="email"
                  class="border rounded-md w-full p-2"
                  bind:value={profile.email}
                />
              </label>

              <label class="block">
                <span>Alias</span>
                <input
                  type="text"
                  class="border rounded-md w-full p-2"
                  bind:value={profile.alias}
                />
              </label>

              <button
                class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                on:click={saveProfile}
              >
                Lưu thay đổi
              </button>
            </div>
          {/if}
        {:else if activeTab === "picture"}
          <h2 class="text-lg font-semibold mb-4">Profile Picture</h2>
          <div class="flex flex-col items-center space-y-3">
            {#if previewUrl || user?.avatarUrl}
              <img
                src={previewUrl || user?.avatarUrl}
                alt="Profile"
                class="w-24 h-24 rounded-full object-cover"
              />
            {:else}
              <div
                class="w-24 h-24 rounded-full bg-orange-700 text-white flex items-center justify-center text-4xl font-bold"
              >
                {user?.username?.[0] ?? "U"}
              </div>
            {/if}

            <input
              type="file"
              accept="image/*"
              on:change={handleFileChange}
              class="hidden"
              bind:this={fileInput}
            />

            <button
              class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              on:click={() => fileInput.click()}
              disabled={uploading}
            >
              {uploading ? "Đang tải..." : "Upload"}
            </button>
          </div>
        {:else if activeTab === "theme"}
          <h2 class="text-lg font-semibold mb-4">Theme</h2>
          <div class="grid grid-cols-3 gap-6">
            {#each themes as t}
              <div
                class={`cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center transition ${
                  selectedTheme === t.name
                    ? "border-blue-500 bg-gray-100"
                    : "border-gray-200 hover:border-gray-400"
                }`}
                on:click={() => applyTheme(t.name)}
              >
                <div
                  class="w-24 h-20 rounded-md overflow-hidden flex shadow-sm"
                >
                  <div
                    class="flex-1 flex flex-col justify-between p-1"
                    style="background-color: {t.left}"
                  >
                    <div class="space-y-1">
                      <div class="w-6 h-1.5 bg-white/70 rounded"></div>
                      <div class="w-4 h-1.5 bg-white/70 rounded"></div>
                      <div class="w-8 h-1.5 bg-white/70 rounded"></div>
                    </div>
                    <div class="flex space-x-1 self-end">
                      <div
                        class="w-1.5 h-1.5 rounded-full"
                        style="background-color:{t.dots}"
                      ></div>
                      <div
                        class="w-1.5 h-1.5 rounded-full"
                        style="background-color:{t.dots}"
                      ></div>
                      <div
                        class="w-1.5 h-1.5 rounded-full"
                        style="background-color:{t.dots}"
                      ></div>
                    </div>
                  </div>
                  <div class="flex-1" style="background-color: {t.right}"></div>
                </div>
                <p class="mt-2 text-sm font-medium">{t.name}</p>
              </div>
            {/each}
          </div>
        {:else if activeTab === "font"}
          <h2 class="text-lg font-semibold mb-4">Font</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Font</label>
              <select
                bind:value={selectedFont}
                class="w-full border rounded-md p-2 bg-white dark:bg-gray-800 dark:text-gray-100"
                on:change={() => applyFont(selectedFont, fontSize)}
              >
                {#each fonts as f}
                  <option value={f}>{f}</option>
                {/each}
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Font Size</label>
              <select
                bind:value={fontSize}
                class="w-full border rounded-md p-2 bg-white dark:bg-gray-800 dark:text-gray-100"
                on:change={() => applyFont(selectedFont, fontSize)}
              >
                {#each [13, 14, 15, 16, 17, 18, 20] as size}
                  <option value={size}>{size}</option>
                {/each}
              </select>
            </div>

            <div
              class="border rounded-md p-3 mt-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              style="font-family: {selectedFont}; font-size: {fontSize}px;"
            >
              The quick brown fox jumps over the lazy dog.
            </div>
          </div>
        {/if}
      </div>

      <button
        class="absolute top-3 right-4 text-gray-500 hover:text-gray-700"
        on:click={onClose}
      >
        ✕
      </button>
    </div>
  </div>




<style>
  :root {
    color-scheme: light dark;
    --app-font: "Inter";
    --app-font-size: 15px;
  }

  body {
    font-family: var(--app-font), sans-serif;
    font-size: var(--app-font-size);
  }
</style>
