<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { connectNotificationSocket } from "$lib/utils/notificationClient";
  import { trpc } from "$lib/trpc/client";

  let notifications: any[] = [];
  let unread = 0;

  
  onMount(async () => {
    const socket = connectNotificationSocket();
    if (!socket) return;

    
    socket.on("notification:new", (notif: any) => {
      console.log(" [NotificationBell] Nhận thông báo mới:", notif);
      notifications = [notif, ...notifications];
      unread++;
    });

    // Lấy danh sách thông báo hiện tại từ backend (nếu muốn preload)
    try {
      const res = await trpc.notification.list.query();
      notifications = res || [];
      unread = notifications.filter((n) => !n.isRead).length;
    } catch (err) {
      console.error(" [NotificationBell] Lỗi load danh sách:", err);
    }
  });


  function openNotificationPage() {
    unread = 0;
    goto("/notifications");
  }
</script>


<div class="relative cursor-pointer" on:click={openNotificationPage} title="Xem thông báo">
  <i class="bi bi-bell text-xl text-white hover:text-blue-300 transition"></i>

  {#if unread > 0}
    <span
      class="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full"
    >
      {unread}
    </span>
  {/if}
</div>
