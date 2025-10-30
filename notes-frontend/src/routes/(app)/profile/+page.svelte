<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "$lib/trpc/client";
  import { goto } from "$app/navigation";

  let user: any = null;
  let notes: any[] = [];
  let loading = true;

  onMount(async () => {
    const stored = localStorage.getItem("user");
    if (!stored) return goto("/login");

    const localUser = JSON.parse(stored);
    try {
      const res = await trpc.user.getProfileWithNotes.query({
        userId: localUser.id,
      });
      user = res.user;
      notes = res.notes || [];
    } catch (err) {
      console.error(" Lỗi load profile:", err);
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="flex justify-center items-center min-h-screen text-gray-500">
    Đang tải thông tin...
  </div>
{:else}
  <div class="max-w-4xl mx-auto p-8">
    <div class="flex items-center space-x-6 mb-8">
      <img
        src={user?.avatarUrl || "https://i.pravatar.cc/120?u=" + user?.email}
        alt="Avatar"
        class="w-28 h-28 rounded-full object-cover border"
      />
      <div>
        <h1 class="text-2xl font-bold">{user?.username}</h1>
        <p class="text-gray-600">{user?.email}</p>
        {#if user?.alias}
          <p class="italic text-gray-500">Alias: {user.alias}</p>
        {/if}
        <span class="inline-block mt-2 text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
          {user?.role}
        </span>
      </div>
    </div>

    <hr class="my-6 border-gray-300" />

    <h2 class="text-xl font-semibold mb-4">🗒️ Notes đã tạo</h2>

    {#if notes.length === 0}
      <p class="text-gray-500">Bạn chưa có ghi chú nào.</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each notes as n}
          <div
            class="border rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer"
            on:click={() => goto(`/note/${n._id}`)}
          >
            <h3 class="font-semibold text-lg truncate">{n.title || "Untitled"}</h3>
            <p class="text-gray-600 text-sm line-clamp-2">{n.content}</p>
            <p class="text-xs text-gray-400 mt-2">
              Cập nhật: {new Date(n.updatedAt).toLocaleString()}
            </p>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
