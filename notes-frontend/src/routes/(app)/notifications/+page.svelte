<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { trpc } from '$lib/trpc/client';
  import dayjs from 'dayjs';

  let notifications: any[] = [];
  let loading = true;
  let user: any = null;

  //  Khi trang mount, tải danh sách thông báo
  onMount(async () => {
    const stored = localStorage.getItem('user');
    if (!stored) return goto('/login');
    user = JSON.parse(stored);

    try {
      notifications = await trpc.notification.list.query();
    } catch (err) {
      console.error(' [NotificationsPage] Lỗi load danh sách:', err);
    } finally {
      loading = false;
    }
  });

  //  Đánh dấu đã đọc + mở note
  async function openNote(notif: any) {
    try {
      await trpc.notification.markAsRead.mutate({ id: notif._id });

      // ⚡ Cập nhật trạng thái ngay trên UI
      notifications = notifications.map((n) =>
        n._id === notif._id ? { ...n, isRead: true } : n
      );
    } catch (err) {
      console.error(' [markAsRead] lỗi:', err);
    }

    const noteId =
      typeof notif.noteId === 'object' ? notif.noteId._id : notif.noteId;

    if (!noteId) {
      console.warn(' [openNote] Không tìm thấy noteId hợp lệ:', notif);
      return;
    }

    console.log('📖 [openNote] Điều hướng tới note:', noteId);
    goto(`/note/${noteId}`);
  }
</script>

<!-- GIAO DIỆN CHÍNH -->
<div
  class="max-w-2xl mx-auto p-6 rounded-lg shadow transition-colors duration-300"
  style="
    background-color: var(--note-bg);
    color: var(--note-text-color);
    border: 1px solid var(--note-border);
  "
>
  <h1 class="text-2xl font-semibold mb-4" style="color: var(--note-text-color);">
     Thông báo của bạn
  </h1>

  {#if loading}
    <p style="opacity: 0.7;">Đang tải...</p>
  {:else if notifications.length === 0}
    <p style="opacity: 0.7;">Không có thông báo nào.</p>
  {:else}
    <ul class="divide-y rounded-lg" style="border-color: var(--note-border);">
      {#each notifications as n}
        <li
          class="p-4 cursor-pointer transition flex justify-between items-center rounded-md"
          on:mouseenter={(e) =>
            (e.currentTarget.style.backgroundColor =
              'color-mix(in srgb, var(--note-bg) 90%, var(--note-text-color))')}
          on:mouseleave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')}
          on:click={() => openNote(n)}
        >
          <div>
            <p class="font-medium">
              {n.type === 'mention' ? '📣 Bạn được nhắc đến' : ' Bình luận mới'}
            </p>

            <p class="text-sm opacity-80">
              Ghi chú: {n.noteId?.title || 'Không rõ tiêu đề'}
            </p>

            <p class="text-xs opacity-60">
              {dayjs(n.createdAt).format('HH:mm DD/MM/YYYY')}
            </p>
          </div>

          {#if !n.isRead}
            <span
              class="text-xs px-2 py-1 rounded"
              style="
                background-color: color-mix(in srgb, var(--note-text-color) 15%, var(--note-bg));
                color: var(--note-text-color);
              "
            >
              Mới
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
