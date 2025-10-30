<script lang="ts">
  import { trpc } from "$lib/trpc/client";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { get } from "svelte/store";
  import { currentNote } from "$lib/stores/noteStore";
  import NotificationBell from "$lib/components/NotificationBell.svelte";
  import SettingsModal from "$lib/components/SettingsModal.svelte";
  import CreateTeamModal from "./CreateTeamModal.svelte";

  // ====================== STATE ======================
  let openSettings = false;
  let openCreateTeamModal = false;
  let menuOpen = false;
  let userMenuOpen = false;

  let user: any = null;
  let notes: any[] = [];
  let teams: any[] = [];
  let loadingNotes = true;
  let loadingTeams = true;

  // ====================== LIFECYCLE ======================
  onMount(async () => {
    const stored = localStorage.getItem("user");
    if (stored) user = JSON.parse(stored);

    if (!user) {
      goto("/login");
      return;
    }

    try {
      //  Load danh sách note
      notes = await trpc.note.list.query({ userId: user.id });
    } catch (err) {
      console.error("❌ [Sidebar] Lỗi load notes:", err);
    } finally {
      loadingNotes = false;
    }

    try {
      //  Load danh sách team mà user là owner
       let myTeams = [];
  let sharedTeams = [];

  //  Lấy team mình sở hữu
  myTeams = await trpc.team.findByOwner.query({ ownerId: user.id });

  //  Lấy team mình được mời vào
  sharedTeams = await trpc.team.findByMember.query({ userId: user.id });

  //  Loại bỏ team trùng (mình vừa là owner vừa là member)
  sharedTeams = sharedTeams.filter(t => t.ownerId !== user.id);

  //  Gộp lại
  teams = [...myTeams, ...sharedTeams];

    } catch (err) {
      console.error("❌ [Sidebar] Lỗi load teams:", err);
    } finally {
      loadingTeams = false;
    }

    // Tự động đóng menu user khi click ra ngoài
    const closeMenu = () => (userMenuOpen = false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  });

  // ====================== LOGOUT ======================
  const handleLogout = () => {
    localStorage.removeItem("user");
    goto("/login");
  };

  // ====================== TẠO NOTE MỚI ======================
  const createNote = async () => {
    try {
      const note = get(currentNote);

      //  Lưu note hiện tại (nếu có)
      if (note.initialized && note.id) {
        await trpc.note.update.mutate({
          noteId: note.id,
          title: note.title?.trim() || "Untitled",
          content: note.content || "",
        });
      }

      // Tạo note mới
      const payload = {
        title: "Untitled",
        teamId: "default-team-id",
        ownerId: user?.id || "guest",
        content: "Welcome to Notejoy",
      };

      const newNote = await trpc.note.create.mutate(payload);
      notes = [newNote, ...notes];
      menuOpen = false;

      const newId = newNote?._id || newNote?.id;
      if (newId) goto(`/note/${newId}`);
    } catch (err) {
      console.error(" [createNote] Lỗi:", err);
    }
  };
</script>

<!-- ====================== SIDEBAR ====================== -->
<aside
  class="w-64 h-screen flex flex-col justify-between transition-colors duration-300"
  style="background-color: var(--sidebar-bg); color: var(--sidebar-text-color);"
>
  <!--  PHẦN TRÊN -->
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between p-4">
      <h1 class="text-xl font-semibold tracking-tight">notejoy</h1>
      <NotificationBell />
    </div>

    <!-- Add Note Button -->
    <div class="px-4 relative">
      <button
        class="bg-red-600 hover:bg-red-700 text-white font-semibold w-full py-2 rounded-md flex justify-between items-center"
        on:click={() => (menuOpen = !menuOpen)}
      >
        <span>Add Note</span>
        <i class="bi bi-chevron-down text-sm"></i>
      </button>

      {#if menuOpen}
        <div class="absolute z-10 mt-1 w-full bg-white text-gray-800 rounded-md shadow-md border border-gray-200">
          <button
            class="block w-full text-left px-4 py-2 hover:bg-gray-100"
            on:click={() => {
              menuOpen = false;
              createNote();
            }}
          >
            Add Note
          </button>
          <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">
            Add Notebook
          </button>
          <button
            class="block w-full text-left px-4 py-2 hover:bg-gray-100"
            on:click={() => {
              menuOpen = false;
              openCreateTeamModal = true;
            }}
          >
            Add Team Library
          </button>
        </div>
      {/if}
      <CreateTeamModal
  bind:open={openCreateTeamModal}
  on:created={async () => {
    //  Reload danh sách team sau khi tạo mới
    teams = await trpc.team.findByOwner.query({ ownerId: user.id });
  }}
/>

    </div>

    <!-- DANH MỤC -->
    <!-- NAV CUỘN -->
<nav class="mt-5 px-4 space-y-1 text-sm flex-1 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">

      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
        <i class="bi bi-star-fill text-yellow-400"></i> Starred
      </a>

      <a
        class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
        on:click={() => goto("/history")}
      >
        <i class="bi bi-clock"></i> Recent
      </a>

      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
        <i class="bi bi-tags"></i> Tags
      </a>

      <!-- ====================== LIBRARIES ====================== -->
      <div class="mt-4">
        <p class="text-gray-400 uppercase text-xs mb-1">Libraries</p>

        <!-- My Library -->
        <div>
          <div class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
            <i class="bi bi-folder"></i>
            {user?.username || "My Library"}
          </div>

          <div class="ml-6">
            <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
              <i class="bi bi-journal-text"></i> My Notebook
            </a>

            {#if loadingNotes}
              <p class="text-xs text-gray-500 ml-3">Loading notes...</p>
            {:else if notes.length === 0}
              <p class="text-xs text-gray-500 ml-3">No notes yet</p>
            {:else}
              {#each notes as note}
                <a
                  class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer ml-3"
                  on:click={() => goto(`/note/${note._id}`)}
                >
                  <i class="bi bi-file-earmark-text"></i>
                  {note.title || "Untitled"}
                </a>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Team Libraries -->
        {#if loadingTeams}
          <p class="text-xs text-gray-500 mt-2 ml-2">Loading teams...</p>
        {:else if teams.length === 0}
          <p class="text-xs text-gray-500 mt-2 ml-2">No teams yet</p>
        {:else}
          {#each teams as team}
            <div class="mt-2">
              <div
                class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
                on:click={() => goto(`/team/${team._id}`)}
              >
                <i class="bi bi-folder2-open"></i>
                {team.name}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <hr class="my-3 border-gray-700" />

      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
        <i class="bi bi-trash"></i> Trash
      </a>
      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
        <i class="bi bi-arrow-up-circle"></i> Upgrade
      </a>
    </nav>
  </div>

  <!-- ====================== PHẦN USER ====================== -->
  <div
    class="relative border-t border-gray-700 p-4 flex items-center gap-3 cursor-pointer select-none"
    on:click|stopPropagation={() => (userMenuOpen = !userMenuOpen)}
  >
    <img
      src={user?.avatarUrl || "https://i.pravatar.cc/40?img=5"}
      alt="User avatar"
      class="w-10 h-10 rounded-full object-cover"
    />

    <div class="flex-1">
      <p class="font-semibold text-sm">{user?.username || "Guest"}</p>
      <p class="text-xs text-gray-400">Free Plan</p>
    </div>

    <i
      class="bi bi-chevron-up text-gray-400 transition-transform duration-200"
      class:rotate-180={userMenuOpen}
    ></i>

    {#if userMenuOpen}
      <div
        class="absolute bottom-[70px] left-4 w-52 bg-white text-gray-800 rounded-md shadow-lg border border-gray-200 overflow-hidden z-50"
      >
        <button
          class="block w-full text-left px-4 py-2 hover:bg-gray-100"
          on:click={() => goto("/profile")}
        >
          My Profile
        </button>

        <button
          class="block w-full text-left px-4 py-2 hover:bg-gray-100"
          on:click={() => (openSettings = true)}
        >
          Settings
        </button>

        <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">
          Import Notes
        </button>
        <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">
          Apps & Integrations
        </button>
        <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">
          Shortcuts & Markdown
        </button>
        <div class="border-t"></div>
        <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">
          Help
        </button>
        <button
          class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
          on:click={handleLogout}
        >
          Logout
        </button>
      </div>
    {/if}
  </div>

  <SettingsModal
    open={openSettings}
    onClose={() => {
      openSettings = false;
      const stored = localStorage.getItem("user");
      if (stored) user = JSON.parse(stored);
    }}
  />
</aside>

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
