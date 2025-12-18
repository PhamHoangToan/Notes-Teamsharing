<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "$lib/trpc/client";
  import { goto } from "$app/navigation";

  let user: any = null;
  let notes: any[] = [];
  let loading = true;

  /**  Xóa tag HTML và gom khoảng trắng */
  function sanitizeDiff(text: string): string {
    return (
      text
        ?.replace(/<\/?[^>]+(>|$)/g, "")
        ?.replace(/\s+/g, " ")
        ?.trim() || ""
    );
  }

  /** 🧭 Tải danh sách note có lịch sử */
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
      console.log(" [HistoryPage] Notes with editors:", notes);
    } catch (err) {
      console.error(" [HistoryPage] Lỗi tải:", err);
      alert("Không thể tải danh sách lịch sử ghi chú.");
    } finally {
      loading = false;
    }
  });

  /**  Gọi API khôi phục version */
  async function restoreVersion(noteId: string, historyId: string) {
    if (!historyId) {
      alert(" Không xác định được phiên bản để khôi phục.");
      return;
    }

    const confirmRestore = confirm(" Bạn có chắc muốn khôi phục phiên bản này không?");
    if (!confirmRestore) return;

    try {
      console.log(" [restoreVersion] Gửi yêu cầu khôi phục:", {
        noteId,
        historyId,
        restorerId: user?.id,
      });

      const res = await trpc.note.restoreVersion.mutate({
        noteId,
        historyId,
        restorerId: user?.id,
      });

      console.log(" [restoreVersion] Thành công:", res);

      alert(" Đã khôi phục thành công! Đang tải lại nội dung ghi chú...");

      //  Chuyển sang trang ghi chú để reload nội dung mới
      goto(`/note/${noteId}?restored=${Date.now()}`);

    } catch (err: any) {
      console.error(" [restoreVersion] Chi tiết lỗi:", err);
      alert(
        ` Không thể khôi phục:\n${err?.data?.message || err?.message || "Lỗi không xác định"}`
      );
    }
  }
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
            <h2 class="text-lg font-semibold" style="color: var(--note-text-color);">
              {note.title || "Untitled"}
            </h2>
            <span class="text-sm opacity-70">
              Cập nhật: {new Date(note.updatedAt).toLocaleString()}
            </span>
          </div>

          {#if note.editors?.length > 0}
            {#each note.editors as editor}
              <div class="mb-4 border-t pt-3 border-dashed border-gray-400/30">
                <p class="font-medium mb-1">
                   <b>{editor.username}</b>
                  <span class="text-xs opacity-70 ml-1">
                    ({editor.histories?.length || 0} lần chỉnh sửa)
                  </span>
                </p>

                {#each editor.histories.filter(h => h.diff?.length > 0 && h.diff.some(d => sanitizeDiff(d[1]) !== "")) as h}

                  <div
                    class="rounded-md p-3 mb-2 text-sm overflow-x-auto transition-colors duration-300"
                    style="
                      background-color: color-mix(in srgb, var(--note-bg) 90%, var(--note-text-color));
                      border: 1px solid var(--note-border);
                    "
                  >
                    <p class="text-xs mb-2 opacity-70">
                       {new Date(h.createdAt).toLocaleString()}
                    </p>

                    <!-- Diff content -->
                    {#if h.diff?.length > 0}
                      {#each h.diff as d}
                        {#if d[0] === -1}
                          <span
                            class="line-through rounded px-1"
                            style="background-color: color-mix(in srgb, red 20%, var(--note-bg)); color: red;"
                          >
                            {@html sanitizeDiff(d[1])}
                          </span>
                        {:else if d[0] === 1}
                          <span
                            class="rounded px-1"
                            style="background-color: color-mix(in srgb, limegreen 20%, var(--note-bg)); color: limegreen;"
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

                    <!--  Nút khôi phục -->
                    <div class="mt-2 text-right">
                      <button
                        on:click={() => restoreVersion(note._id, h._id)}
                        class="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
                      >
                         Khôi phục phiên bản này
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/each}
          {:else}
            <p class="text-sm opacity-70"> Chưa có lịch sử chỉnh sửa cho ghi chú này.</p>
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
