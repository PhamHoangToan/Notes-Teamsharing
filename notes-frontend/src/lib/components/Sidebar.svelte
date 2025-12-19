<script lang="ts">
  import { trpc } from "$lib/trpc/client";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { get as getStore } from "svelte/store";

  import { currentNote } from "$lib/stores/noteStore";
  import { settingsModalOpen } from "$lib/stores/settingsModal";
  import NotificationBell from "$lib/components/NotificationBell.svelte";
  import CreateTeamModal from "./CreateTeamModal.svelte";

  import { sidebarNotes, setSidebarNotes, upsertSidebarNote } from "$lib/stores/sidebarNotes";

  let openCreateTeamModal = false;
  let menuOpen = false;
  let userMenuOpen = false;

  let user: any = null;
  let teams: any[] = [];

  let loadingNotes = true;
  let loadingTeams = true;

  const closeUserMenu = () => (userMenuOpen = false);

  // ===== Helpers (QUAN TRỌNG) =====
  function getNoteId(n: any) {
    return n?._id ?? n?.id ?? null;
  }

  function getNoteTeamId(n: any) {
    // backend có thể trả teamId hoặc trả team object
    return n?.teamId ?? n?.team?._id ?? n?.team?.id ?? null;
  }

  function normalizeNote(note: any, fallbackTeamId?: string | null) {
    const _id = note?._id ?? note?.id;
    const id = note?.id ?? note?._id;

    // Không ép teamId cho note riêng.
    // Chỉ bổ sung teamId nếu note thiếu teamId mà bạn truyền fallbackTeamId (dùng cho note team).
    const teamId =
      note?.teamId ?? (fallbackTeamId != null ? fallbackTeamId : undefined);

    return {
      ...note,
      _id,
      id,
      ...(teamId !== undefined ? { teamId } : {})
    };
  }

  function notesByTeam(teamId: string) {
    return $sidebarNotes.filter((n: any) => String(getNoteTeamId(n)) === String(teamId));
  }

  function personalNotes() {
    // FIX: phải dùng getNoteTeamId để không bị lệch khi backend trả team object
    return $sidebarNotes.filter((n: any) => getNoteTeamId(n) == null);
  }

  onMount(() => {
    const onNoteCreated = (e: any) => {
      // Cho phép trang khác tạo note (team/personal) rồi bắn event để sidebar update ngay
      const note = e?.detail?.note;
      const teamId = e?.detail?.teamId ?? null;
      if (!note) return;

      upsertSidebarNote(normalizeNote(note, teamId));
    };

    (async () => {
      const stored = localStorage.getItem("user");
      if (stored) user = JSON.parse(stored);

      if (!user) {
        goto("/login");
        return;
      }

      // Load notes for sidebar
      try {
        const fetchedNotes = await trpc.note.listForSidebar.query({ userId: user.id });
        setSidebarNotes(fetchedNotes);
        console.log("[Sidebar] Loaded notes =", fetchedNotes.length);
      } catch (err) {
        console.error("[Sidebar] Load notes error:", err);
      } finally {
        loadingNotes = false;
      }

      // Load teams
      try {
        const myTeams = await trpc.team.findByOwner.query({ ownerId: user.id });
        let sharedTeams = await trpc.team.findByMember.query({ userId: user.id });
        sharedTeams = sharedTeams.filter((t: any) => t.ownerId !== user.id);
        teams = [...myTeams, ...sharedTeams];
      } catch (err) {
        console.error("[Sidebar] Load teams error:", err);
      } finally {
        loadingTeams = false;
      }

      window.addEventListener("click", closeUserMenu);
      window.addEventListener("note:created", onNoteCreated);
    })();

    return () => {
      window.removeEventListener("click", closeUserMenu);
      window.removeEventListener("note:created", onNoteCreated);
    };
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    goto("/login");
  };

  const createNote = async () => {
    console.log(" [AddNote] Click Add Note");

    try {
      const note = getStore(currentNote);
      console.log(" [AddNote] currentNote =", note);

      if (note?.initialized && note?.id) {
        console.log(" [AddNote] Updating current note BEFORE create", {
          noteId: note.id,
          title: note.title
        });

        await trpc.note.update.mutate({
          noteId: note.id,
          title: note.title?.trim() || "Untitled",
          content: note.content || ""
        });

        console.log(" [AddNote] Update current note DONE");
      } else {
        console.log("ℹ [AddNote] No current note to update");
      }

      console.log(" [AddNote] Creating NEW note...");
      const newNote = await trpc.note.create.mutate({
        title: "Untitled",
        ownerId: user.id,
        content: "Welcome to Notejoy"
      });

      console.log(" [AddNote] New note CREATED:", newNote);

      // FIX: normalize id/_id trước khi upsert để đảm bảo store match đúng
      upsertSidebarNote(normalizeNote(newNote));

      console.log(" [AddNote] Sidebar notes total =", getStore(sidebarNotes).length);

      menuOpen = false;

      const id = getNoteId(newNote);
      console.log(" [AddNote] Navigate to noteId =", id);

      if (id) goto(`/note/${id}`);
      else console.error(" [AddNote] New note has NO ID", newNote);
    } catch (err) {
      console.error(" [AddNote] ERROR:", err);
    }
  };
</script>

<!-- ====================== SIDEBAR ====================== -->
<aside
  class="w-64 h-screen flex flex-col transition-colors duration-300 overflow-hidden"
  style="background-color: var(--sidebar-bg); color: var(--sidebar-text-color);"
>
  <!-- ================= TOP ================= -->
  <div class="flex flex-col flex-1 min-h-0">
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

    <!-- ================= NAV (SCROLL AREA) ================= -->
    <nav class="mt-5 px-4 space-y-1 text-sm flex-1 min-h-0 overflow-y-auto pr-2 sidebar-scroll">
      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700">
        <i class="bi bi-star-fill text-yellow-400"></i>
        Starred
      </a>

      <a class="flex items-center gap-2 p-2 rounded hover:bg-gray-700" on:click={() => goto("/history")}>
        <i class="bi bi-clock"></i>
        Recent
      </a>

      <!-- ================= LIBRARIES ================= -->
      <div class="mt-4">
        <p class="text-gray-400 uppercase text-xs mb-1">Libraries</p>

        {#if loadingNotes || loadingTeams}
          <p class="text-xs text-gray-500 ml-3">Loading...</p>
        {:else}
          <!-- PERSONAL -->
          <div class="flex items-center gap-2 p-2 rounded hover:bg-gray-700">
            <i class="bi bi-folder"></i>
            {user?.username || "My Library"}
          </div>

          <div class="ml-6">
            {#each personalNotes() as note (note._id || note.id)}
              <a
                class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 ml-3"
                on:click={() => goto(`/note/${note._id || note.id}`)}
              >
                <i class="bi bi-file-earmark-text"></i>
                {note.title || "Untitled"}
              </a>
            {/each}

            {#if personalNotes().length === 0}
              <p class="text-xs text-gray-500 ml-3">No personal notes</p>
            {/if}
          </div>

          <!-- TEAMS -->
          {#each teams as team (team._id || team.id)}
            {@const teamId = team._id || team.id}

            <div
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 mt-3 font-semibold"
              on:click={() => goto(`/team/${teamId}`)}
            >
              <i class="bi bi-folder2-open"></i>
              {team.name}
            </div>

            <div class="ml-6">
              {#each notesByTeam(String(teamId)) as note (note._id || note.id)}
                <a
                  class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 ml-3"
                  on:click={() => goto(`/note/${note._id || note.id}`)}
                >
                  <i class="bi bi-file-earmark-text"></i>
                  {note.title || "Untitled"}
                </a>
              {/each}

              {#if notesByTeam(String(teamId)).length === 0}
                <p class="text-xs text-gray-500 ml-3">No team notes</p>
              {/if}
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
      alt="avatar"
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

        <button class="block w-full px-4 py-2 text-left hover:bg-gray-100" on:click={() => settingsModalOpen.set(true)}>
          Settings
        </button>

        <div class="border-t"></div>

        <button class="block w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600" on:click={handleLogout}>
          Logout
        </button>
      </div>
    {/if}
  </div>
</aside>

<style>
  .sidebar-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .sidebar-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999px;
  }
  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
  }
</style>
