<script lang="ts">
  import { trpc } from "$lib/trpc/client";
  import { createEventDispatcher } from "svelte";

  export let teamId: string;
  const dispatch = createEventDispatcher();

  let email = "";
  let role: "viewer" | "editor" = "viewer";
  let loading = false;

  async function invite() {
    if (!email.trim()) {
      alert("Nhập email thành viên cần mời!");
      return;
    }

    loading = true;
    try {
      await trpc.team.inviteByEmail.mutate({ teamId, email, role });
      alert(" Đã thêm thành viên vào team!");
      dispatch("added");
    } catch (err) {
      console.error(" [InviteModal] Lỗi:", err);
      alert("Không thể thêm thành viên!");
    } finally {
      loading = false;
    }
  }
</script>

<!--  Modal container -->
<div
  class="rounded-lg p-6 shadow-lg w-96 transition-colors duration-300"
  style="
    background-color: var(--modal-bg, var(--sidebar-bg));
    color: var(--text-color, var(--sidebar-text-color));
  "
>
  <h2 class="text-lg font-semibold mb-4">Mời thành viên mới</h2>

  <input
    type="email"
    bind:value={email}
    placeholder="Nhập email..."
    class="border rounded px-3 py-2 w-full mb-3 transition-colors duration-300"
    style="
      border-color: var(--border-color, #ccc);
      background-color: var(--input-bg, transparent);
      color: var(--text-color, inherit);
    "
  />

  <label class="block mb-1 text-sm font-medium" style="color: var(--text-muted, #888)">
    Quyền truy cập:
  </label>

  <select
    bind:value={role}
    class="border rounded px-3 py-2 w-full mb-4 transition-colors duration-300"
    style="
      border-color: var(--border-color, #ccc);
      background-color: var(--input-bg, transparent);
      color: var(--text-color, inherit);
    "
  >
    <option value="viewer">👁 Viewer (chỉ xem)</option>
    <option value="editor">✏️ Editor (chỉnh sửa)</option>
  </select>

  <button
    class="px-4 py-2 rounded w-full font-semibold transition-colors duration-200"
    style="
      background-color: var(--primary-color, #2563eb);
      color: var(--button-text, white);
    "
    disabled={loading}
    on:click={invite}
  >
    {loading ? "Đang mời..." : "Mời thành viên"}
  </button>
</div>

<style>
  :global(html[data-theme='dark']) {
    --modal-bg: #2e2e2e;
    --text-color: #f3f3f3;
    --text-muted: #a1a1a1;
    --border-color: #555;
    --input-bg: #3a3a3a;
    --primary-color: #1d4ed8;
    --button-text: #fff;
  }

  :global(html[data-theme='light']) {
    --modal-bg: #ffffff;
    --text-color: #222;
    --text-muted: #555;
    --border-color: #ccc;
    --input-bg: #f9f9f9;
    --primary-color: #2563eb;
    --button-text: #fff;
  }
</style>
