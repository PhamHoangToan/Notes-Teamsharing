<script lang="ts">
  import { trpc } from "$lib/trpc/client";
  import { onMount } from "svelte";
  import dayjs from "dayjs";

  let teams: any[] = [];
  let loading = true;
  let user: any = null;

  onMount(async () => {
    const stored = localStorage.getItem("user");
    if (stored) user = JSON.parse(stored);

    try {
      teams = await trpc.team.findByOwner.query({ ownerId: user.id });
    } catch (err) {
      console.error(" Lỗi load teams:", err);
    } finally {
      loading = false;
    }
  });
</script>

<div class="p-6">
  <h1 class="text-2xl font-semibold mb-4">My Teams</h1>

  {#if loading}
    <p>Đang tải...</p>
  {:else if teams.length === 0}
    <p class="text-gray-500">Chưa có team nào.</p>
  {:else}
    <div class="grid gap-3">
      {#each teams as team}
        <div
          class="border rounded-md p-4 bg-white shadow-sm hover:shadow-md transition"
        >
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-lg font-semibold">{team.name}</h2>
              <p class="text-gray-500 text-sm">{team.description}</p>
            </div>
            <span class="text-xs text-gray-400">
              {dayjs(team.createdAt).format("DD/MM/YYYY")}
            </span>
          </div>
          <div class="mt-2 text-sm text-gray-600">
             {team.members?.length || 0} thành viên
          </div>
        </div>
      {/each}
    </div>
  {/if} <!--  đóng block if đúng chỗ -->
</div>
