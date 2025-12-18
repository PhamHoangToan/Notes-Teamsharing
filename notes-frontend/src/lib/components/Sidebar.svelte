<script lang="ts">
  import { trpc } from "$lib/trpc/client";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { get } from "svelte/store";
  import { currentNote } from "$lib/stores/noteStore";
  import { settingsModalOpen } from "$lib/stores/settingsModal";

  import NotificationBell from "$lib/components/NotificationBell.svelte";
  import CreateTeamModal from "./CreateTeamModal.svelte";

  // ====================== STATE ======================
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
      notes = await trpc.note.list.query({ userId: user.id });
    } catch (err) {
      console.error("[Sidebar] Load notes error:", err);
    } finally {
      loadingNotes = false;
    }

    try {
      const myTeams = await trpc.team.findByOwner.query({ ownerId: user.id });
      let sharedTeams = await trpc.team.findByMember.query({ userId: user.id });
      sharedTeams = sharedTeams.filter((t) => t.ownerId !== user.id);
      teams = [...myTeams, ...sharedTeams];
    } catch (err) {
      console.error("[Sidebar] Load teams error:", err);
    } finally {
      loadingTeams = false;
    }

    const closeMenu = () => (userMenuOpen = false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  });

  // ====================== LOGOUT ======================
  const handleLogout = () => {
    localStorage.removeItem("user");
    goto("/login");
  };

  // ====================== CREATE NOTE ======================
  const createNote = async () => {
    try {
      const note = get(currentNote);
      if (note.initialized && note.id) {
        await trpc.note.update.mutate({
          noteId: note.id,
          title: note.title?.trim() || "Untitled",
          content: note.content || "",
        });
      }

      const newNote = await trpc.note.create.mutate({
        title: "Untitled",
        teamId: "default-team-id",
        ownerId: user.id,
        content: "Welcome to Notejoy",
      });

      notes = [newNote, ...notes];
      menuOpen = false;

      const id = newNote._id || newNote.id;
      if (id) goto(`/note/${id}`);
    } catch (err) {
      console.error("[createNote] Error:", err);
    }
  };
</script>

<!-- ====================== SIDEBAR ====================== -->
<aside
  class="w-64 h-screen flex flex-col justify-between transition-colors duration-300"
  style="background-color: var(--sidebar-bg); color: var(--sidebar-text-color);"
>
  <!-- ================= TOP ================= -->
  <div>
    <div class="flex items-center justify-between p-4">
      <h1 class="text-xl font-semibold">notejoy</h1>
      <NotificationBell />
    </div>

    <!-- Add Note -->
    <div class="px-4 relative">
      <button
        class="bg-red-600 hover:bg-red-700 text-white font-semibold w-full py-2 rounded-md flex justify-between items-center"
        on:click={() => (menuOpen = !menuOpen)}
      >
        <span>Add Note</span>
        <i class="bi bi-chevron-down text-sm"></i>
      </button>

      {#if menuOpen}
        <div class="absolute z-10 mt-1 w-full bg-white text-gray-800 rounded-md shadow border">
          <button class="block w-full px-4 py-2 text-left hover:bg-gray-100" on:click={createNote}>
            Add Note
          </button>
          <button
            class="block w-full px-4 py-2 text-left hover:bg-gray-100"
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
          teams = await trpc.team.findByOwner.query({ ownerId: user.id });
        }}
      />
    </div>

    <!-- ================= NAV ================= -->
    <nav class="mt-5 px-4 space-y-1 text-sm flex-1 overflow-y-auto pr-2">
      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700">
        <i class="bi bi-star-fill text-yellow-400"></i> Starred
      </a>

      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700" on:click={() => goto("/history")}>
        <i class="bi bi-clock"></i> Recent
      </a>

      <!-- ================= LIBRARIES ================= -->
      <div class="mt-4">
        <p class="text-gray-400 uppercase text-xs mb-1">Libraries</p>

        <div class="flex items-center gap-2 p-2 rounded hover:bg-gray-700">
          <i class="bi bi-folder"></i>
          {user?.username || "My Library"}
        </div>

        <div class="ml-6">
          {#if loadingNotes}
            <p class="text-xs text-gray-500 ml-3">Loading notes...</p>
          {:else}
            {#each notes as note}
              <a
                class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 ml-3"
                on:click={() => goto(`/note/${note._id || note.id}`)}
              >
                <i class="bi bi-file-earmark-text"></i>
                {note.title || "Untitled"}
              </a>
            {/each}
          {/if}
        </div>

        {#if !loadingTeams}
          {#each teams as team}
            <div
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 mt-1"
              on:click={() => goto(`/team/${team._id}`)}
            >
              <i class="bi bi-folder2-open"></i>
              {team.name}
            </div>
          {/each}
        {/if}
      </div>
    </nav>
  </div>

  <!-- ================= USER MENU ================= -->
  <div
    class="relative border-t border-gray-700 p-4 flex items-center gap-3 cursor-pointer"
    on:click|stopPropagation={() => (userMenuOpen = !userMenuOpen)}
  >
    <img
      src={user?.avatarUrl || "https://i.pravatar.cc/40"}
      class="w-10 h-10 rounded-full object-cover"
    />

    <div class="flex-1">
      <p class="font-semibold text-sm">{user?.username}</p>
      <p class="text-xs text-gray-400">Free Plan</p>
    </div>

    {#if userMenuOpen}
      <div class="absolute bottom-[70px] left-4 w-52 bg-white text-gray-800 rounded-md shadow border z-50">
        <button class="block w-full px-4 py-2 text-left hover:bg-gray-100" on:click={() => goto("/profile")}>
          My Profile
        </button>

        <button
          class="block w-full px-4 py-2 text-left hover:bg-gray-100"
          on:click={() => settingsModalOpen.set(true)}
        >
          Settings
        </button>

        <div class="border-t"></div>

        <button
          class="block w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
          on:click={handleLogout}
        >
          Logout
        </button>
      </div>
    {/if}
  </div>
</aside>
