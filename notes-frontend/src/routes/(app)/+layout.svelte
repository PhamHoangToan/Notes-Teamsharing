<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { onMount, tick } from "svelte";
  import { goto } from "$app/navigation";
  import { trpc } from "$lib/trpc/client";
  import { connectNotificationSocket } from "$lib/utils/notificationClient";

  let user: any = null;
  let notes: any[] = [];
  let loading = true;
  let showSidebar = false;

  console.log("🟢 [Layout] Script evaluated — showSidebar =", showSidebar);

  onMount(async () => {
    console.log("🚀 [onMount] Layout mounted!");
    console.log("🌍 Capacitor available?", !!window.Capacitor);

    const stored = localStorage.getItem("user");
    if (!stored) {
      console.warn("⚠️ [Auth] No user found → redirect login");
      goto("/login");
      return;
    }

    user = JSON.parse(stored);
    console.log("👤 User:", user);

    connectNotificationSocket();

    try {
      console.log("📂 Fetching notes...");
      notes = await trpc.note.list.query();
      console.log("✅ Notes loaded:", notes.length);
    } catch (err) {
      console.error("❌ [tRPC] Error loading notes:", err);
    } finally {
      loading = false;
      console.log("✅ [Layout] Done loading");
    }
  });

  async function toggleSidebar() {
    console.log("👆 [Click ☰ or ✕] Received!");
    showSidebar = !showSidebar;
    await tick();
    console.log("🟣 [Sidebar] Toggled →", showSidebar ? "OPEN" : "CLOSED");
  }

  function testLog() {
    console.log("🧩 [Test Button] Click event works!");
  }
</script>

<!-- ======================== GIAO DIỆN ======================== -->
<div class="flex h-screen transition-colors duration-300 relative">
  <!-- 🔹 SIDEBAR -->
  <aside
    class="fixed md:static top-0 left-0 h-full w-64 bg-[var(--sidebar-bg)] text-[var(--sidebar-text-color)]
           transform transition-transform duration-300 ease-in-out z-40 md:translate-x-0 shadow-lg"
    class:translate-x-0={showSidebar}
    class:-translate-x-full={!showSidebar}
  >
    <!-- Header mobile -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-600 md:hidden">
      <h2 class="font-semibold text-lg">Ghi chú</h2>
      <button on:click={toggleSidebar} class="text-gray-200 hover:text-white text-2xl" type="button">✕</button>
    </div>

    <Sidebar />

    {#if loading}
      <p class="p-4 opacity-70">Đang tải ghi chú...</p>
    {:else if notes.length === 0}
      <p class="p-4 opacity-70">Chưa có ghi chú nào</p>
    {:else}
      <ul>
        {#each notes as n}
          <li>
            <button
              on:click={() => {
                console.log("📑 [Note click]", n.title);
                goto(`/note/${n._id || n.id}`);
                showSidebar = false;
              }}
              class="block w-full text-left px-3 py-2 border-b border-gray-700 hover:bg-gray-700/30"
            >
              <p class="font-medium truncate">{n.title || "Untitled"}</p>
              <p class="text-xs opacity-70 truncate">{n.content || "..."}</p>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>

  <!-- 🔹 Overlay khi sidebar mở -->
  {#if showSidebar}
    <div
      role="button"
      tabindex="0"
      aria-label="Đóng sidebar"
      class="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
      on:click={toggleSidebar}
    ></div>
  {/if}

  <!-- 🔹 MAIN CONTENT -->
  <main
    class="flex-1 overflow-y-auto p-4 transition-colors duration-300 w-full"
    style="background-color: var(--note-bg); color: var(--note-text-color);"
  >
    <!-- Header mobile -->
    <div class="flex items-center justify-between mb-4 md:hidden mt-3">
      <button class="text-3xl text-gray-700" on:click={toggleSidebar} type="button">☰</button>
      <h1 class="text-lg font-semibold">TeamNotes</h1>
    </div>

    <!-- 👇 Nút test log -->
    <div class="p-4 md:hidden">
      <button
        on:click={testLog}
        class="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md active:scale-95 transition"
      >
        Test Log
      </button>
    </div>

    <slot />
  </main>
</div>

<style>
  :root {
    --sidebar-bg: #2e2e2e;
    --sidebar-text-color: #f9fafb;
    --note-bg: #ffffff;
    --note-text-color: #111827;
  }
</style>

<script context="module">
  // export const ssr = false;
</script>
