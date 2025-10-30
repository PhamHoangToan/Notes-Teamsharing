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

  export let noteId: string;
  export let ydoc: any;
  export let provider: any;
  export let content: string = "";

  let editor: TipTapEditor | null = null;
  let editorContainer: HTMLElement;
  let fileInput: HTMLInputElement;

  const username =
    localStorage.getItem("username") ||
    `User-${Math.floor(Math.random() * 1000)}`;
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const trpc = get(noteStore).trpc;
  const dispatch = createEventDispatcher();

  // ===================== KHỞI TẠO EDITOR =====================
  onMount(() => {
    console.log("🧠 [Editor] Mounting TipTap (noteId):", noteId);

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
          // ✏️ Cơ bản
          StarterKit.configure({ history: false }),

          // 🖼️ Cho phép hiển thị ảnh & link
          Image,
          Link.configure({
            openOnClick: true,
            autolink: true,
            linkOnPaste: true,
          }),

          // 🔄 Cộng tác realtime (Yjs)
          Collaboration.configure({ document: ydoc }),
          CollaborationCursor.configure({
            provider,
            user: {
              name: username,
              color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            },
          }),

          // 💬 Mention
          Mention.configure({
            HTMLAttributes: { class: "mention" },
            suggestion: {
              char: "@",
              items: async ({ query }) => {
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
                  onStart: (props) => {
                    popup = document.createElement("div");
                    popup.className = "mention-popup";
                    updatePopup(props);
                    document.body.appendChild(popup);
                  },
                  onUpdate: updatePopup,
                  onKeyDown: (props) => {
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
                    popup.appendChild(el);
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
        console.log(
          "🪄 [Editor] Set content from prop:",
          content.slice(0, 200)
        );
        editor.commands.setContent(content);
      }

      // Khi người dùng gõ @ → phát sự kiện ra ngoài
      editor.on("keydown", (event: KeyboardEvent) => {
        if (event.key === "@") dispatch("mentiontrigger");
      });
    } catch (err) {
      console.error(" [Editor] Error initializing TipTap:", err);
    }

    return cleanupEditor;
  });

  // ===================== UPLOAD FILE =====================
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
        "http://localhost:4000"; // fallback

      console.group("📤 [Upload] Bắt đầu upload file...");
      console.log("🧾 noteId:", noteId);
      console.log("👤 uploaderId:", user.id);
      console.log("📎 file:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
      console.log("🌐 API URL:", `${apiUrl}/file/upload`);
      console.groupEnd();

      const res = await fetch(`${apiUrl}/file/upload`, {
        method: "POST",
        body: formData,
      });

      const uploaded = await res.json();
      console.group("📦 [Upload] Kết quả response:");
      console.log("🧩 Raw response object:", uploaded);
      console.log("🔗 url:", uploaded?.url);
      console.log("🔗 s3Url:", uploaded?.s3Url);
      console.log("📄 fileName:", uploaded?.fileName);
      console.log("📜 mimeType:", uploaded?.mimeType);
      console.groupEnd();

      if (uploaded?.url || uploaded?.s3Url?.url) {
        const imageUrl = uploaded.url || uploaded.s3Url?.url;
        const fileName = uploaded.fileName || file.name;
        const mimeType = uploaded.mimeType || file.type;

        console.group("🖼️ [Insert Content]");
        console.log("🔗 imageUrl:", imageUrl);
        console.log("📄 fileName:", fileName);
        console.log("📜 mimeType:", mimeType);
        console.groupEnd();

        if (mimeType.startsWith("image/")) {
          editor?.chain().focus().setImage({ src: imageUrl, alt: fileName }).run();
          console.log("✅ Đã chèn ảnh vào editor (thumbnail nhỏ)!");
        } else {
          editor?.commands.insertContent(
            `<a href="${imageUrl}" target="_blank" rel="noopener">${fileName}</a>`
          );
          console.log(" Đã chèn link file vào editor!");
        }
      } else {
        console.warn(" Không tìm thấy URL hợp lệ trong response:", uploaded);
      }
    } catch (err) {
      console.error(" [Upload] Lỗi upload file:", err);
      alert("Không thể upload file.");
    }
  }

  // ===================== CLEANUP =====================
  function cleanupEditor() {
    console.log("🧹 [Editor] Destroying TipTap instance...");
    try {
      editor?.destroy?.();
      editor = null;
    } catch (err) {
      console.error(" [Editor] Error destroying editor:", err);
    }
  }

  onDestroy(cleanupEditor);
</script>

<!-- ===================== UI ===================== -->
<div class="flex gap-2 items-center mb-2">
  <button
    type="button"
    on:click={() => fileInput.click()}
    class="p-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
  >
    📎 Thêm tệp
  </button>
  <input
    type="file"
    accept="image/*,.pdf,.doc,.docx"
    class="hidden"
    bind:this={fileInput}
    on:change={handleFileUpload}
  />
</div>

<div
  bind:this={editorContainer}
  class="note-editor-container prose max-w-none p-4 border rounded-md focus:outline-none transition-colors duration-300"
  style="
    background-color: var(--note-bg);
    color: var(--text-color);
    border-color: var(--note-border);
  "
></div>



<style>
  /* .ProseMirror {
    outline: none;
    min-height: 400px;
    background-color: var(--note-bg);
    color: var(--note-text-color);
  } */

  /* 👇 Cuộn trong vùng hiển thị nội dung */
.note-editor-container {
  min-height: 400px;
  max-height: 70vh;
  overflow-y: auto;
  position: relative;
  scroll-behavior: smooth;
  padding-right: 8px; /* tránh che scrollbar */
}

/* 👇 Thanh cuộn đẹp */
.note-editor-container::-webkit-scrollbar {
  width: 8px;
}

.note-editor-container::-webkit-scrollbar-track {
  background: transparent;
}

.note-editor-container::-webkit-scrollbar-thumb {
  background-color: rgba(120, 120, 120, 0.4);
  border-radius: 4px;
  transition: background-color 0.3s;
}

.note-editor-container:hover::-webkit-scrollbar-thumb {
  background-color: rgba(120, 120, 120, 0.7);
}

.ProseMirror {
  outline: none;
  background-color: var(--note-bg);
  color: var(--note-text-color);
  min-height: 400px;
  padding-right: 8px;
}


/* Thanh cuộn mảnh và tinh tế */
.ProseMirror::-webkit-scrollbar {
  width: 8px;
}

.ProseMirror::-webkit-scrollbar-track {
  background: transparent;
}

.ProseMirror::-webkit-scrollbar-thumb {
  background-color: rgba(120, 120, 120, 0.4);
  border-radius: 4px;
  transition: background-color 0.3s;
}

.ProseMirror:hover::-webkit-scrollbar-thumb {
  background-color: rgba(120, 120, 120, 0.7);
}

  .mention-popup {
    background-color: var(--note-bg);
    color: var(--note-text-color);
    border: 1px solid var(--note-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    border-radius: 6px;
    padding: 4px;
    width: 160px;
    transition:
      background-color 0.3s,
      color 0.3s;
    z-index: 9999;
  }

  .mention-item {
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 4px;
  }

  .mention-item:hover {
    background-color: color-mix(
      in srgb,
      var(--note-bg) 80%,
      var(--note-text-color)
    );
  }

  .ProseMirror img {
    max-width: 150px;
    max-height: 150px;
    width: auto;
    height: auto;
    border-radius: 6px;
    object-fit: cover;
    display: inline-block;
  }
  .ProseMirror img,
  .ProseMirror .note-image {
    max-width: 150px;
    max-height: 150px;
    width: auto;
    height: auto;
    border-radius: 6px;
    object-fit: cover;
    display: inline-block;
    margin: 4px;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .ProseMirror img:hover,
  .ProseMirror .note-image:hover {
    transform: scale(1.05);
  }
  :global(.ProseMirror img),
  :global(.ProseMirror .note-image),
  :global(.note-editor-container img) {
    max-width: 70px !important; /* 👈 Kích thước ảnh nhỏ */
    max-height: 70px !important;
    width: auto !important;
    height: auto !important;
    display: inline-block;
    border-radius: 8px;
    object-fit: cover;
    margin: 4px;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  :global(.ProseMirror img:hover),
  :global(.ProseMirror .note-image:hover),
  :global(.note-editor-container img:hover) {
    transform: scale(1.05);
  }
</style>
