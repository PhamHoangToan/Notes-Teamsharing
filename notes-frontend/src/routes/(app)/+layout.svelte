<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { trpc } from "$lib/trpc/client";
  import { connectNotificationSocket } from "$lib/utils/notificationClient";

  let user: any = null;
  let notes: any[] = [];
  let loading = true;

  onMount(async () => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      goto("/login");
      return;
    }

    user = JSON.parse(stored);
    connectNotificationSocket();

    try {
      notes = await trpc.note.list.query();
    } catch (err) {
      console.error("❌ [Layout] Lỗi tải note:", err);
    } finally {
      loading = false;
    }
  });
</script>

<!-- ======================== GIAO DIỆN ======================== -->
<div class="flex h-screen transition-colors duration-300">
  <Sidebar />

  <!-- Sidebar list note -->
  <aside
    class="w-64 overflow-y-auto border-r scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
    style="background-color: var(--sidebar-bg); color: var(--sidebar-text-color);"
  >
    {#if loading}
      <p class="p-4 opacity-70">Đang tải ghi chú...</p>
    {:else if notes.length === 0}
      <p class="p-4 opacity-70">Chưa có ghi chú nào</p>
    {:else}
      <ul>
        {#each notes as n}
          <li>
            <button
              on:click={() => goto(`/note/${n._id || n.id}`)}
              class="block w-full text-left px-3 py-2 border-b transition-colors duration-200"
              style="
                border-color: color-mix(in srgb, var(--sidebar-text-color) 15%, transparent);
                color: var(--sidebar-text-color);
              "
              on:mouseover={(e) =>
                (e.currentTarget.style.backgroundColor =
                  'color-mix(in srgb, var(--sidebar-text-color) 10%, var(--sidebar-bg))')
              }
              on:mouseout={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--sidebar-bg)')}
            >
              <p class="font-medium truncate">{n.title || "Untitled"}</p>
              <p class="text-xs opacity-70 truncate">{n.content || "..."}</p>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>

  <!-- Note content -->
  <main
    class="flex-1 overflow-y-auto p-4 transition-colors duration-300"
    style="background-color: var(--note-bg); color: var(--note-text-color);"
  >
    <slot />
  </main>
</div>

<style>
  :root {
    --sidebar-bg: #3a3a3a;
    --sidebar-text-color: #f9fafb;
    --note-bg: #ffffff;
    --note-text-color: #111827;
  }
</style>
