<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "$lib/trpc/client";
  import { goto } from "$app/navigation";

  let user: any = null;
  let notes: any[] = [];
  let loading = true;


  function sanitizeDiff(text: string): string {
    return (
      text
        ?.replace(/<\/?[^>]+(>|$)/g, "") // xóa tất cả thẻ HTML
        ?.replace(/\s+/g, " ") // gom khoảng trắng
        ?.trim() || ""
    );
  }


  onMount(async () => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      goto("/login");
      return;
    }
    user = JSON.parse(stored);

    try {
  
      const res = await trpc.note.recentByUser.query({ userId: user.id });
      notes = res || [];
      console.log("[HistoryPage] Notes with editors:", notes);
    } catch (err) {
      console.error(" [HistoryPage] Error loading notes:", err);
    } finally {
      loading = false;
    }
  });
</script>

<!-- ======================== GIAO DIỆN ======================== -->
<div
  class="p-6 min-h-screen transition-colors duration-300"
  style="
    background-color: var(--note-bg);
    color: var(--note-text-color);
  "
>
  <h1
    class="text-2xl font-semibold mb-4 transition-colors duration-300"
    style="color: var(--note-text-color);"
  >
    🕒 Lịch sử chỉnh sửa gần đây
  </h1>

  {#if loading}
    <p style="color: var(--note-text-color); opacity: 0.7;">Đang tải...</p>
  {:else if notes.length === 0}
    <p style="color: var(--note-text-color); opacity: 0.7;">Không có ghi chú nào.</p>
  {:else}
    <div class="space-y-6">
      {#each notes as note}
        <div
          class="rounded-lg shadow-sm p-5 transition-colors duration-300"
          style="
            background-color: var(--note-bg);
            color: var(--note-text-color);
            border: 1px solid var(--note-border);
          "
        >
          <!-- Tiêu đề note -->
          <div class="flex justify-between items-center mb-3">
            <h2
              class="text-lg font-semibold"
              style="color: var(--note-text-color);"
            >
              {note.title || "Untitled"}
            </h2>
            <span class="text-sm" style="opacity: 0.7;">
              Cập nhật: {new Date(note.updatedAt).toLocaleString()}
            </span>
          </div>

          {#if note.editors?.length > 0}
            <!-- Danh sách người chỉnh sửa -->
            {#each note.editors as editor}
              <div class="mb-4 border-t pt-3 border-dashed border-gray-400/30">
                <p class="font-medium mb-1">
                  👤 <b>{editor.username}</b>
                  <span class="text-xs opacity-70 ml-1">
                    ({editor.histories?.length || 0} lần chỉnh sửa)
                  </span>
                </p>

                {#each editor.histories as h}
                  <div
                    class="rounded-md p-3 mb-2 text-sm overflow-x-auto transition-colors duration-300"
                    style="
                      background-color: color-mix(in srgb, var(--note-bg) 90%, var(--note-text-color));
                      border: 1px solid var(--note-border);
                    "
                  >
                    <p class="text-xs mb-2" style="opacity: 0.7;">
                      🕓 {new Date(h.createdAt).toLocaleString()}
                    </p>

                    <!-- Diff -->
                    {#if h.diff?.length > 0}
                      {#each h.diff as d}
                        {#if d[0] === -1}
                          <span
                            class="line-through rounded px-1"
                            style="
                              background-color: color-mix(in srgb, red 20%, var(--note-bg));
                              color: red;
                            "
                          >
                            {@html sanitizeDiff(d[1])}
                          </span>
                        {:else if d[0] === 1}
                          <span
                            class="rounded px-1"
                            style="
                              background-color: color-mix(in srgb, limegreen 20%, var(--note-bg));
                              color: limegreen;
                            "
                          >
                            {@html sanitizeDiff(d[1])}
                          </span>
                        {:else}
                          <span>{@html sanitizeDiff(d[1])}</span>
                        {/if}
                      {/each}
                    {:else}
                      <p style="opacity: 0.6;">(Không có thay đổi nội dung)</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/each}
          {:else}
            <p class="text-sm opacity-70">
              📝 Chưa có lịch sử chỉnh sửa cho ghi chú này.
            </p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  span {
    white-space: pre-wrap;
  }
</style>
