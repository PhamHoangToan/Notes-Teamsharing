<script lang="ts">
  import { trpc } from "$lib/trpc/client";
  import { createEventDispatcher } from "svelte";
  import { onMount } from "svelte";

  export let open = false;
  const dispatch = createEventDispatcher();

  let name = "";
  let description = "";
  let creating = false;
  let error = "";
  let user: any = null;

  onMount(() => {
    const stored = localStorage.getItem("user");
    if (stored) user = JSON.parse(stored);
  });

  async function createTeam() {
    if (!name.trim()) {
      error = "Tên team không được để trống";
      return;
    }

    try {
      creating = true;
      error = "";

      await trpc.team.create.mutate({
        name,
        description,
        ownerId: user?.id,
      });

      dispatch("created");
      open = false;
      name = "";
      description = "";
    } catch (err) {
      console.error(" [CreateTeamModal] Lỗi:", err);
      error = "Không thể tạo team, vui lòng thử lại.";
    } finally {
      creating = false;
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div
      class="rounded-xl p-6 w-96 shadow-lg transition-colors duration-300"
      style="
        background-color: var(--modal-bg, #1e1e1e);
        color: var(--modal-text, #f5f5f5);
      "
    >
      <h2 class="text-xl font-semibold mb-4">Tạo Team Library</h2>

      <label class="block mb-2 text-sm font-medium opacity-90">Tên team</label>
      <input
        class="w-full border rounded-md px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
        bind:value={name}
        placeholder="VD: Product Design Team"
        style="
          border-color: var(--border-color, #555);
          background-color: var(--input-bg, #2b2b2b);
          color: var(--text-color, #fff);
        "
      />

      <label class="block mb-2 text-sm font-medium opacity-90">Mô tả</label>
      <textarea
        class="w-full border rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition"
        bind:value={description}
        placeholder="Mô tả ngắn gọn về team..."
        style="
          border-color: var(--border-color, #555);
          background-color: var(--input-bg, #2b2b2b);
          color: var(--text-color, #fff);
        "
      ></textarea>

      {#if error}
        <p class="text-red-400 text-sm mb-2">{error}</p>
      {/if}

      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white"
          on:click={() => (open = false)}
        >
          Hủy
        </button>
        <button
          class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          on:click={createTeam}
          disabled={creating}
        >
          {creating ? "Đang tạo..." : "Tạo team"}
        </button>
      </div>
    </div>
  </div>
{/if}

