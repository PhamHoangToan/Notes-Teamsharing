<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { Editor as TipTapEditor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Mention from "@tiptap/extension-mention";
  import Collaboration from "@tiptap/extension-collaboration";
  import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
  import Image from "@tiptap/extension-image";
  import Link from "@tiptap/extension-link";
  import { noteStore } from "$lib/stores/noteStore";
  import { get } from "svelte/store";

  // ==================== PROPS ====================
  export let noteId: string;
  export let ydoc: any;
  export let provider: any;
  export let content: string = "";
  export let note: any = null; //  thêm prop note (có createdAt, title, ...)
  export let socket: any;
  export let userColor: string;
  let noteFiles: {
    id: string; // <-- Đảm bảo có ID
    url: string;
    fileName: string;
    mimeType: string;
    createdAt: string;
    fileSize?: number;
  }[] = [];

  // ==================== STATE ====================
  let editor: TipTapEditor | null = null;
  let editorContainer: HTMLElement;
  let fileInput: HTMLInputElement;
  let noteImages: {
    id: string; // <-- Đảm bảo có ID
    url: string;
    fileName: string;
    mimeType: string;
    createdAt: string;
  }[] = [];
  let timelineItems: {
    type: "text" | "image" | "file";
    createdAt: string;
    id?: string; // <-- Thêm ID
    html?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
  }[] = [];

  const username =
    localStorage.getItem("username") ||
    `User-${Math.floor(Math.random() * 1000)}`;
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const trpc = get(noteStore).trpc;
  const dispatch = createEventDispatcher();

  // ==================== LOAD ATTACHMENTS (ảnh + file) ====================
  async function loadNoteAttachments() {
    try {
      const apiUrl =
        import.meta.env.PUBLIC_API_URL?.replace("/trpc", "") ||
        "http://localhost:4000";

      const res = await fetch(`${apiUrl}/file/${noteId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Chia tệp ra 2 loại
      const imageFiles = data.filter((f: any) =>
        f.mimeType?.startsWith("image/")
      );
      const otherFiles = data.filter(
        (f: any) => !f.mimeType?.startsWith("image/")
      );

      //  Danh sách ảnh (thêm f._id)
      noteImages = imageFiles.map((f: any) => ({
        id: f._id, // <-- Quan trọng
        url: typeof f.s3Url === "string" ? f.s3Url : f.s3Url?.url || f.url || null,
        fileName: f.fileName,
        mimeType: f.mimeType,
        createdAt: f.createdAt || new Date().toISOString(),
      }));

      //  Danh sách file khác (thêm f._id)
      noteFiles = otherFiles.map((f: any) => ({
        id: f._id, // <-- Quan trọng
        url: typeof f.s3Url === "string" ? f.s3Url : f.s3Url?.url || f.url || null,
        fileName: f.fileName,
        mimeType: f.mimeType,
        createdAt: f.createdAt || new Date().toISOString(),
        fileSize: f.fileSize || 0,
      }));

      console.log(" [Files] Loaded:", {
        images: noteImages.length,
        files: noteFiles.length,
      });
    } catch (err) {
      console.error("[Attachments] Lỗi tải danh sách tệp:", err);
      noteImages = [];
      noteFiles = [];
    }
  }
  function formatFileSize(size?: number) {
    if (!size) return "";
    const mb = size / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }
  // ==================== MERGE NOTE + IMAGES + FILE LINKS ====================
  async function loadNoteContent() {
    //  1. Sửa lỗi thẻ <link> -> <a>
    if (content) {
      content = content
        .replace(/<link\b/gi, "<a")
        .replace(/<\/link>/gi, "</a>");
    }

    await loadNoteAttachments();

    //  2. Tạo object nội dung text
    const noteContent = {
      type: "text",
      createdAt: note?.createdAt || new Date().toISOString(),
      html: content,
    };

    //  3. Gộp tất cả vào timeline (Thêm 'id' vào item ảnh và file)
    timelineItems = [
      noteContent,
      ...noteImages.map((img) => ({
        type: "image",
        id: img.id, // <-- SỬA LỖI: Thêm ID
        createdAt: img.createdAt,
        url: img.url,
        fileName: img.fileName,
      })),
      ...noteFiles.map((f) => ({
        type: "file",
        id: f.id, // <-- SỬA LỖI: Thêm ID
        createdAt: f.createdAt,
        url: f.url,
        fileName: f.fileName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
      })),
    ].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(" [Timeline] Combined items:", timelineItems);
  }

  // ==================== INIT EDITOR ====================
  onMount(async () => {
    console.log(" [Editor] Mounting TipTap:", noteId);
    await loadNoteContent(); //  gọi hàm mới (đã gộp nội dung + ảnh)

    if (!ydoc || !provider) {
      console.error(" [Editor] Missing ydoc/provider props!");
      return;
    }

    provider.on("status", (e: any) => {
      console.log(" [Yjs WebRTC] Connection status:", e.status);
    });

    try {
      editor = new TipTapEditor({
        element: editorContainer,
        extensions: [
          StarterKit.configure({ history: false }),
          Image,
          Link.configure({
            openOnClick: true,
            autolink: true,
            linkOnPaste: true,
          }),
          Collaboration.configure({ document: ydoc }),
          CollaborationCursor.configure({
            provider,
            user: {
              name: username,
              color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            },
          }),
          Mention.configure({
            HTMLAttributes: { class: "mention" },
            suggestion: {
              char: "@",
              items: async ({ query }: { query: string }) => {
                try {
                  const res = await trpc?.user?.searchByName?.query({
                    keyword: query || "",
                  });
                  return (
                    res?.map((u: any) => ({
                      id: u._id,
                      label: u.username,
                    })) ?? []
                  );
                } catch (err) {
                  console.error(" [Mention Error]:", err);
                  return [];
                }
              },
              render: () => {
                let popup: HTMLDivElement | null = null;
                return {
                  onStart: (props: { x: number; y: number }) => {
                    popup = document.createElement("div");
                    popup.className = "mention-popup";
                    updatePopup(props);
                    document.body.appendChild(popup);
                  },
                  onUpdate: updatePopup,
                  onKeyDown: (props: { event: KeyboardEvent }) => {
                    if (props.event.key === "Escape") {
                      popup?.remove();
                      popup = null;
                      return true;
                    }
                    return false;
                  },
                  onExit: () => {
                    popup?.remove();
                    popup = null;
                  },
                };

                function updatePopup(props: any) {
                  if (!popup) return;
                  popup.innerHTML = "";
                  props.items.forEach((item: any) => {
                    const el = document.createElement("div");
                    el.textContent = `@${item.label}`;
                    el.className = "mention-item";
                    el.addEventListener("click", () => {
                      props.command({ id: item.id, label: item.label });
                 });
                   let popup: HTMLDivElement | null = document.querySelector('#popup');

if (popup) {
  popup.appendChild(el);
}

                  });
                  const { from } = props.range;
                  const coords = props.editor.view.coordsAtPos(from);
                  popup.style.position = "absolute";
                  popup.style.left = `${coords.left}px`;
                  popup.style.top = `${coords.bottom + 5}px`;
                }
              },
              command: ({ editor, range, props }) => {
                editor
                  .chain()
                  .focus()
                  .insertContentAt(range, `@${props.label} `)
                  .run();
              },
            },
          }),
        ],
        autofocus: true,
        content: "<p>Đang tải nội dung...</p>",
        onUpdate: ({ editor }) => {
          const html = editor.getHTML();
          noteStore.updateContent(html);
        },
      });

      console.log(" [Editor] TipTap initialized!");
      if (content && editor) {
        editor.commands.setContent(content);
      }

      editor.on("keydown", (event: KeyboardEvent) => {
        if (event.key === "@") dispatch("mentiontrigger");
      });
      editor.on("selectionUpdate", () => {
        const pos = editor.state.selection?.from || 0;
        socket?.emit("cursor:move", {
          position: pos,
          color: userColor,
        });
      });
    } catch (err) {
      console.error(" [Editor] Error initializing TipTap:", err);
    }
  });

  // ==================== FILE UPLOAD ====================
  async function handleFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("noteId", noteId);
    formData.append("uploaderId", user.id);

    try {
      const apiUrl =
        import.meta.env.PUBLIC_API_URL?.replace("/trpc", "") ||
        "http://localhost:4000";

      const res = await fetch(`${apiUrl}/file/upload`, {
        method: "POST",
        body: formData,
      });

      const uploaded = await res.json();
      const imageUrl =
        typeof uploaded.url === "object"
          ? uploaded.url?.url
          : uploaded.url || uploaded.s3Url?.url;

      if (!imageUrl) return;

      const fileName = uploaded.fileName || file.name;
      const mimeType = uploaded.mimeType || file.type;

      if (mimeType.startsWith("image/")) {
        editor?.chain().focus().setImage({ src: imageUrl, alt: fileName }).run();
        console.log(" Đã chèn ảnh vào editor!");
      } else {
        console.log(" Đã thêm tệp, đang làm mới timeline...");
      }

      // Reload timeline sau upload
      await loadNoteContent();
    } catch (err) {
      console.error(" [Upload] Lỗi upload file:", err);
      alert("Không thể upload file.");
    }
  }

  // ==================== SỬA LỖI: Bổ sung hàm xóa ====================
  async function deleteAttachment(fileId: string) {
    if (!fileId) {
      console.error(" [Delete] Missing fileId");
      return;
    }
    if (!confirm("Bạn có chắc muốn xóa tệp này?")) {
      return;
    }

    try {
      const apiUrl =
        import.meta.env.PUBLIC_API_URL?.replace("/trpc", "") ||
        "http://localhost:4000";

      const res = await fetch(`${apiUrl}/file/${fileId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status} - ${errorText}`);
      }

      console.log(" [File] Đã xóa tệp:", fileId);

      // Tải lại danh sách tệp và cập nhật timeline
      await loadNoteContent();
    } catch (err) {
      console.error(" [Delete] Lỗi xóa tệp:", err);
      alert("Đã xảy ra lỗi khi xóa tệp.");
    }
  }

  // ==================== CLEANUP ====================
  function cleanupEditor() {
    console.log(" [Editor] Destroying TipTap instance...");
    try {
      editor?.destroy?.();
      editor = null;
    } catch (err) {
      console.error(" [Editor] Error destroying editor:", err);
    }
  }

  onDestroy(cleanupEditor);
</script>

<div class="flex gap-2 items-center mb-2">
  <button
    type="button"
    on:click={() => fileInput.click()}
    class="p-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
  >
     Thêm tệp
  </button>
  <input
    type="file"
    accept="image/*,.pdf,.doc,.docx"
    class="hidden"
    bind:this={fileInput}
    on:change={handleFileUpload}
  />
</div>

<div class="mt-4 space-y-6">
  {#each timelineItems as item}
    {#if item.type === "text"}
      <div
        class="note-timeline-text border rounded-md p-4"
        style="border-color: var(--note-border); background-color: var(--note-bg); color: var(--text-color);"
      >
                <div bind:this={editorContainer}></div>
        <p class="text-xs text-gray-500 mt-2">
          🕒 {new Date(item.createdAt).toLocaleString("vi-VN")}
        </p>
      </div>
        {:else if item.type === "image"}
      <div
        class="note-timeline-image group relative flex flex-col items-start border rounded-md p-2"
      >
        <img
          src={item.url}
          alt={item.fileName}
          class="max-w-[300px] max-h-[200px] object-cover rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer hover:scale-[1.02] transition-transform"
          on:click={() => window.open(item.url, "_blank")}
        />
        <p class="text-xs text-gray-500 mt-1">
          {item.fileName} — 🕒 {new Date(item.createdAt).toLocaleString("vi-VN")}
        </p>
        <button
          on:click={() => deleteAttachment(item.id)}
          class="absolute top-1 right-1 p-1 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Xóa ảnh"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            /></svg
          >
        </button>
      </div>
    {:else if item.type === "file"}
  <div
    class="note-timeline-file-wrapper group relative w-fit"
    on:click={(e) => {
      if (e.target.closest("button")) return; //  tránh click vào nút xóa
      window.open(item.url, "_blank");
    }}
  >
    <!--  Nút xóa -->
    <button
      on:click={() => deleteAttachment(item.id)}
      class="delete-btn"
      title="Xóa tệp"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>

    <!--  Nội dung file -->
    <div
      class="note-timeline-file flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition w-[240px]"
    >
      <div
        class="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-md flex justify-center items-center flex-shrink-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 text-gray-700 dark:text-gray-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 3v18m10-18v18M3 7h18M3 17h18"
          />
        </svg>
      </div>

      <div class="flex flex-col truncate">
        <span class="font-medium text-sm truncate">{item.fileName}</span>
        <span class="text-xs text-gray-500 truncate">
          {formatFileSize(item.fileSize)} — {new Date(item.createdAt).toLocaleString("vi-VN")}
        </span>
      </div>
    </div>
  </div>
{/if}

  {/each}
</div>
<style>
  /*  Giới hạn kích thước ảnh trong vùng soạn thảo (phía trên) */
  /*  Giới hạn kích thước ảnh trong vùng soạn thảo (phía trên) */
.ProseMirror img {
  max-width: 200px !important;
  max-height: 150px !important;
  width: auto !important;
  height: auto !important;
  object-fit: cover;
  border-radius: 8px;
  margin: 6px 0;
  display: inline-block;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.ProseMirror img:hover {
  transform: scale(1.05);
}

.note-editor-container {
  min-height: 400px;
  max-height: 70vh;
  overflow-y: auto;
  position: relative;
  scroll-behavior: smooth;
  padding-right: 8px;
}

.mention-popup {
  background-color: var(--note-bg);
  color: var(--note-text-color);
  border: 1px solid var(--note-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  padding: 4px;
  width: 160px;
  z-index: 9999;
}

.mention-item {
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.mention-item:hover {
  background-color: color-mix(in srgb, var(--note-bg) 80%, var(--note-text-color));
}

/*  Timeline ảnh */
.note-timeline-image img {
  max-width: 200px !important;
  max-height: 150px !important;
  object-fit: cover;
  border-radius: 8px;
  margin-top: 4px;
  transition: transform 0.2s ease;
  cursor: pointer;
}
.note-timeline-image img:hover {
  transform: scale(1.05);
}
.note-timeline-image {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  position: relative;
}

/*  Timeline file */
.note-timeline-file {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
  transition: transform 0.2s ease;
}
.dark .note-timeline-file {
  border-color: rgba(255, 255, 255, 0.1);
}
.note-timeline-file:hover {
  transform: translateY(-1px);
}

/*  Nút xóa tệp / ảnh */
.delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 4px;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.45);
  color: white;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.15s ease;
}
.group:hover .delete-btn {
  opacity: 1;
  transform: scale(1.05);
}
.delete-btn:hover {
  background-color: rgba(220, 38, 38, 0.8); /* đỏ khi hover */
}
  .note-timeline-image {
  display: none !important;
}
/* Nhóm bao toàn bộ file + nút xóa */
.note-timeline-file-wrapper {
  position: relative;
  display: inline-block;
}

/* Khối file nhỏ gọn hơn */
.note-timeline-file {
  max-width: 240px; /* Giảm kích thước */
  overflow: hidden; /* Bọc text dài */
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Nút xoá hiển thị khi hover */
.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 4px;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.15s ease;
  z-index: 10; /*  đảm bảo nổi lên trên */
}

.group:hover .delete-btn {
  opacity: 1;
  transform: scale(1.05);
}

.delete-btn:hover {
  background-color: rgba(220, 38, 38, 0.8);
}


</style>
