<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "$lib/trpc/client";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import InviteModal from "$lib/components/InviteModal.svelte";

  let teamId = "";
  let team: any = null;
  let notes: any[] = [];
  let loading = true;
  let user: any = null;
  let openInvite = false;

 
  async function refreshTeam() {
    try {
      team = await trpc.team.getById.query({ teamId });
      console.log(" [refreshTeam] Reloaded team:", team);
    } catch (err) {
      console.error(" [refreshTeam] Lỗi:", err);
    }
  }

  onMount(async () => {
    console.log(" [TeamPage] Mounting...");

    
    const stored = localStorage.getItem("user");
    if (stored) {
      user = JSON.parse(stored);
      console.log(" [TeamPage] User loaded:", user);
    } else {
      console.warn(" [TeamPage] No user found → redirecting...");
      goto("/login");
      return;
    }

    
    const unsubscribe = page.subscribe(async ($page) => {
      teamId = $page.params.id;
      if (!teamId) {
        console.warn(" Không có teamId trong URL");
        return;
      }

      try {
        loading = true;

   
        console.log(" Fetching team info...");
        team = await trpc.team.getById.query({ teamId });
        console.log(" Team loaded:", team);

       
        if (team && team.members) {
          const isMember = team.members.some((m) => m.userId === user.id);
          if (!isMember && user.id !== team.ownerId) {
            alert("❌ Bạn không có quyền truy cập team này!");
            goto("/team");
            return;
          }
        }

       
        console.log("📡 Fetching notes...");
        notes = await trpc.note.listByTeam.query({
  teamId,
  viewerId: user.id,
  viewerEmail: user.email, 
});

        console.log(" Notes loaded:", notes);
      } catch (err) {
        console.error(" Lỗi load team hoặc notes:", err);
      } finally {
        loading = false;
      }
    });

    return () => {
      unsubscribe();
    };
  });

  
  async function addNoteToTeam() {
    if (!user || !teamId) {
      alert("⚠️ Thiếu user hoặc teamId");
      return;
    }

    try {
      const payload = {
        title: "Untitled",
        content: "Welcome to team note!",
        teamId,
        ownerId: user.id,
      };
      console.log(" Tạo note:", payload);

      const newNote = await trpc.note.create.mutate(payload);
      console.log("Note created:", newNote);

      notes = [newNote, ...notes];
    } catch (err) {
      console.error(" [addNoteToTeam] Lỗi:", err);
    }
  }
</script>


{#if loading}
  <p class="p-6 text-gray-400">⏳ Đang tải team...</p>
{:else if !team}
  <p class="p-6 text-gray-400">❌ Không tìm thấy team này.</p>
{:else}
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-semibold">{team.name}</h1>
        <p class="text-gray-500">{team.description}</p>
      </div>

      <div class="flex gap-3">
        <button
          class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          on:click={() => (openInvite = true)}
        >
          + Mời thành viên
        </button>

        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          on:click={addNoteToTeam}
        >
          + Add Team Note
        </button>
      </div>
    </div>

    <!-- 🗂 Danh sách ghi chú -->
    <div class="space-y-2">
      {#each notes as note}
        <div
          class="p-3 bg-gray-800 text-white rounded cursor-pointer hover:bg-gray-700 flex justify-between items-center"
          on:click={() => goto(`/note/${note._id}`)}
        >
          <span>
            <i class="bi bi-file-earmark-text mr-2"></i>
            {note.title || "Untitled"}
          </span>
          <span class="text-xs text-gray-400">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
      {/each}

      {#if notes.length === 0}
        <p class="text-gray-500 text-sm italic mt-4">Chưa có ghi chú nào trong team này.</p>
      {/if}
    </div>


    {#if openInvite}
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <InviteModal teamId={teamId} on:added={() => { refreshTeam(); openInvite = false; }} />
        <button
          class="absolute top-6 right-6 text-white text-2xl"
          on:click={() => (openInvite = false)}
        >
          ✖
        </button>
      </div>
    {/if}
  </div>
{/if}
