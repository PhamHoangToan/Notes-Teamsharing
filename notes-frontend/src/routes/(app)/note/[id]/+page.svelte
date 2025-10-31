<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { trpc } from "$lib/trpc/client";
  import { createYDoc } from "$lib/utils/yjsClient";
  import Editor from "$lib/components/Editor.svelte";
  import CommentList from "$lib/components/CommentList.svelte";
  import MentionDropdown from "$lib/components/MentionDropdown.svelte";
  import * as Y from "yjs";
  import { currentNote, noteStore } from "$lib/stores/noteStore";
  import { io, Socket } from "socket.io-client";

  // =============================== STATE ===============================
  let ydoc: Y.Doc | null = null;
  let provider: any = null;
  let noteId = "";
  let note: any = null;
  let loading = true;
  let syncing = false;
  let lastSyncedAt: string | null = null;
  let saveTimer: any;
  let unsubscribe: () => void;
  export let content: string = "";

  let openCollaborators = false;
  let userIdToAdd = "";
  let roleToAdd: "viewer" | "editor" = "viewer";

  let showMentionDropdown = false;
  let socket: Socket | null = null;
  let onlineUsers: any[] = [];
  let userColor = "#" + Math.floor(Math.random() * 16777215).toString(16);

  // =============================== MOUNT ===============================
  onMount(() => {
    unsubscribe = page.subscribe(($page) => {
      const id = $page.params.id;
      if (id && id !== noteId) {
        loadNote(id);
      }
    });
    return () => {
      unsubscribe?.();
      cleanupYjs();
    };
  });

  onDestroy(() => {
    cleanupYjs();
    unsubscribe?.();
  });

  // =============================== LOAD NOTE ===============================
  async function loadNote(id: string) {
    noteId = id;
    note = null;
    loading = true;
    cleanupYjs();

    console.log(" [NotePage] Loading note:", id);

    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await trpc.note.getById.query({
        noteId: id,
        viewerId: currentUser?.id,
      });
      if (!res) throw new Error("Note not found");
      note = res;

      const { ydoc: newYdoc, provider: newProvider } = createYDoc(id);
      ydoc = newYdoc;
      provider = newProvider;

      // --- PRESENCE CONNECTION ---
      const apiUrl =
        import.meta.env.PUBLIC_API_URL?.replace("/trpc", "") ||
        "http://localhost:4000";

      socket = io(`${apiUrl}/presence`, {
        query: {
          noteId: id,
          userId: currentUser?.id,
          color: userColor,
        },
      });

      socket.on("connect", () => {
        console.log("🟢 [Presence] Connected", socket.id);
      });

      socket.on("presence:update", (users) => {
        onlineUsers = users;
        console.log("👥 [Presence] Active users:", users);
      });

      socket.on("disconnect", () => {
        console.log("🔴 [Presence] Disconnected");
      });

      // --- Yjs fragment ---
      const fragment = ydoc.getXmlFragment("default");
      if (fragment.length === 0 && note.content) {
        const paragraph = new Y.XmlElement("paragraph");
        const textNode = new Y.XmlText();
        textNode.insert(0, note.content.replace(/<[^>]+>/g, ""));
        paragraph.insert(0, [textNode]);
        fragment.insert(0, [paragraph]);
      }

      fragment.observeDeep(() => scheduleSave());

      provider.on("status", (e: any) => {
        syncing = e.status === "connected";
        if (syncing) {
          lastSyncedAt = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      });

      noteStore.setCurrentNote({
        id,
        title: note.title,
        content: note.content || "",
      });
    } catch (err) {
      console.error(" [NotePage] Load note error:", err);
    } finally {
      loading = false;
    }
  }

  // =============================== SAVE ===============================
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNoteToServer, 2000);
  }

  async function saveNoteToServer() {
    if (!ydoc || !noteId) return;
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const fragment = ydoc.getXmlFragment("default");

      const div = document.createElement("div");
      div.appendChild(fragment.toDOM());
      const htmlContent = div.innerHTML; // ✅ giữ nguyên định dạng xuống dòng

      await trpc.note.update.mutate({
        noteId,
        content: htmlContent,
        authorId: currentUser?.id,
      });

      lastSyncedAt = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      console.log(" [AutoSave] Saved successfully");
    } catch (err) {
      console.error(" [AutoSave] Failed:", err);
    }
  }

  async function saveTitleNow() {
    if (!noteId || !note?.title) return;
    try {
      await trpc.note.update.mutate({ noteId, title: note.title });
      lastSyncedAt = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      console.error(" [saveTitleNow] Failed:", err);
    }
  }

  function cleanupYjs() {
    provider?.destroy();
    ydoc?.destroy();
    provider = null;
    ydoc = null;
    socket?.disconnect();
    socket = null;
  }

  // =============================== COLLABORATOR ===============================
  async function addCollaborator() {
    if (!userIdToAdd.trim()) {
      alert("Nhập user ID cần cấp quyền!");
      return;
    }

    try {
      await trpc.note.addCollaborator.mutate({
        noteId: note._id,
        userId: userIdToAdd,
        role: roleToAdd,
      });
      alert("✅ Đã cấp quyền thành công!");
      openCollaborators = false;
    } catch (err) {
      console.error(" [addCollaborator] Error:", err);
      alert("Không thể cấp quyền!");
    }
  }

  // =============================== MENTION ===============================
  function handleMentionTrigger() {
    showMentionDropdown = true;
  }

  async function handleMentionSelect(user: any) {
    showMentionDropdown = false;
    try {
      await trpc.note.addComment.mutate({
        noteId,
        authorId: JSON.parse(localStorage.getItem("user") || "{}").id,
        text: `@${user.username}`,
        type: "mention",
        mentionedUserId: user._id,
      });
      console.log(" [Mention] Added mention:", user.username);
    } catch (err) {
      console.error(" [Mention] Failed:", err);
    }
  }
</script>

<!-- ============================ GIAO DIỆN ============================ -->
{#if loading}
  <div class="flex justify-center items-center h-screen text-gray-400">
    ⏳ Đang tải ghi chú...
  </div>
{:else if note}
  <div
    class="p-6 flex flex-col gap-4 transition-colors duration-300"
    style="background-color: var(--note-bg); color: var(--note-text-color);"
  >
    <div class="flex items-center justify-between mb-3">
      <input
        type="text"
        bind:value={note.title}
        on:blur={saveTitleNow}
        on:keydown={(e) => e.key === "Enter" && e.target.blur()}
        class="text-2xl font-semibold border-b focus:border-blue-400 focus:outline-none flex-1 mr-4 transition-colors duration-300"
        style="color: var(--note-text-color); background-color: var(--note-bg); border-color: var(--note-border);"
        placeholder="(Không có tiêu đề)"
      />
      <!-- <div class="flex items-center gap-2">
  {#each onlineUsers as u}
    <div
      class="w-3 h-3 rounded-full border border-white shadow-sm"
      style="background-color: {u.cursor?.color || '#ccc'};"
      title={u.userId}
    ></div>
  {/each}
</div> -->

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-400">Công khai:</label>
          <input
            type="checkbox"
            class="accent-blue-500 w-4 h-4 cursor-pointer"
            bind:checked={note.isPublic}
            on:change={async (e) => {
              try {
                const updated = await trpc.note.togglePublic.mutate({
                  noteId,
                  isPublic: e.currentTarget.checked,
                });
                note = updated;
              } catch (err) {
                console.error(" [togglePublic] Error:", err);
              }
            }}
          />
        </div>

        <span class="text-sm text-gray-400">
          {#if syncing}
            🔄 Đang đồng bộ...
          {:else if lastSyncedAt}
            ✅ Lưu lúc {lastSyncedAt}
          {:else}
            &nbsp;
          {/if}
        </span>
      </div>
    </div>
    <div class="flex items-center gap-3">
      {#each onlineUsers as u}
        <div class="flex items-center gap-1">
          <img
            src={u.userId?.avatarUrl || "/default-avatar.png"}
            alt={u.userId?.username}
            class="w-6 h-6 rounded-full border border-gray-300 object-cover"
          />
          <span class="text-sm" style="color: {u.cursor?.color || '#999'};">
            {u.userId?.username || "Ẩn danh"}
          </span>
        </div>
      {/each}
    </div>

    {#if ydoc && provider}
    
      <div
        class="flex-1 border rounded-md overflow-hidden relative"
        style="border-color: var(--note-border);"
      >
        <div
          class="note-scroll-area overflow-y-auto max-h-[100vh] p-2"
          style="scrollbar-width: thin;"
        >
          <Editor
            {noteId}
            {provider}
            {ydoc}
            {socket}
            {userColor}
            content={note.content}
            on:mentiontrigger={handleMentionTrigger}
          />
        </div>

        {#if showMentionDropdown}
          <MentionDropdown onSelect={handleMentionSelect} />
        {/if}
      </div>
    {:else}
      <div class="flex-1 flex items-center justify-center text-gray-400 italic">
        Đang khởi tạo trình soạn thảo...
      </div>
    {/if}

    <button
      class="bg-gray-700 text-white px-3 py-1 rounded self-start"
      on:click={() => (openCollaborators = true)}
    >
      👥 Cấp quyền
    </button>

    {#if openCollaborators}
      <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition"
      >
        <div
          class="rounded-lg p-6 shadow-xl w-96 transition-colors duration-300"
          style="
        background-color: var(--modal-bg, var(--sidebar-bg, #1e1e1e));
        color: var(--text-color, var(--sidebar-text-color, #f5f5f5));
      "
        >
          <h3 class="text-lg font-semibold mb-4">Phân quyền người dùng</h3>

          <input
            type="email"
            bind:value={userIdToAdd}
            placeholder="Nhập email người dùng..."
            class="border rounded px-3 py-2 w-full mb-3 transition-colors duration-300"
            style="
          border-color: var(--border-color, #555);
          background-color: var(--input-bg, #2b2b2b);
          color: var(--text-color, #fff);
        "
          />

          <select
            bind:value={roleToAdd}
            class="border rounded px-3 py-2 w-full mb-4 transition-colors duration-300"
            style="
          border-color: var(--border-color, #555);
          background-color: var(--input-bg, #2b2b2b);
          color: var(--text-color, #fff);
        "
          >
            <option value="viewer">👁 Viewer (chỉ xem)</option>
            <option value="editor">✏️ Editor (chỉnh sửa)</option>
          </select>

          <div class="flex justify-end gap-2 mt-2">
            <button
              class="px-4 py-2 rounded-md bg-gray-500 hover:bg-gray-600 text-white transition"
              on:click={() => (openCollaborators = false)}
            >
              Hủy
            </button>

            <button
              class="px-4 py-2 rounded-md font-semibold transition"
              style="
            background-color: var(--primary-color, #2563eb);
            color: var(--button-text, white);
          "
              on:click={addCollaborator}
            >
              Cấp quyền
            </button>
          </div>
        </div>
      </div>
    {/if}

    <CommentList {noteId} />
  </div>
{:else}
  <p class="text-center text-gray-400 mt-10">❌ Không tìm thấy ghi chú</p>
{/if}

<style>
  /* ✅ Giới hạn kích thước ảnh trong vùng soạn thảo (phía trên) */

  .note-scroll-area {
    overflow-y: auto;
    max-height: 200vh;
    scroll-behavior: smooth;
    scrollbar-width: thin;
  }

  .note-scroll-area::-webkit-scrollbar {
    width: 8px;
  }

  .note-scroll-area::-webkit-scrollbar-thumb {
    background-color: rgba(150, 150, 150, 0.4);
    border-radius: 8px;
  }

  .note-scroll-area::-webkit-scrollbar-thumb:hover {
    background-color: rgba(150, 150, 150, 0.6);
  }
   .note-scroll-area {
    overflow-y: auto;
    max-height: 80vh; /* ✅ Giới hạn vùng hiển thị, để scrollbar xuất hiện */
    scroll-behavior: smooth;
    scrollbar-width: thin;
  }

  .note-scroll-area::-webkit-scrollbar {
    width: 10px; /* ✅ to hơn để dễ thấy */
  }

  .note-scroll-area::-webkit-scrollbar-track {
    background: rgba(200, 200, 200, 0.1);
  }

  .note-scroll-area::-webkit-scrollbar-thumb {
    background-color: rgba(150, 150, 150, 0.4);
    border-radius: 8px;
  }

  .note-scroll-area::-webkit-scrollbar-thumb:hover {
    background-color: rgba(150, 150, 150, 0.7);
  }
  .note-timeline-image {
  display: none !important;
}

</style>
