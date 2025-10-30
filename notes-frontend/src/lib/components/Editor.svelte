<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { Editor as TipTapEditor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Mention from "@tiptap/extension-mention";
  import Collaboration from "@tiptap/extension-collaboration";
  import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
  import { noteStore } from "$lib/stores/noteStore";
  import { get } from "svelte/store";

  export let noteId: string;
  export let ydoc: any;
  export let provider: any;

  let editor: TipTapEditor | null = null;
  let editorContainer: HTMLElement;

  const username =
    localStorage.getItem("username") ||
    `User-${Math.floor(Math.random() * 1000)}`;
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const trpc = get(noteStore).trpc;
  const dispatch = createEventDispatcher();

  onMount(() => {
    console.log(" [Editor] Mounting TipTap WebRTC CRDT:", noteId);

    if (!ydoc || !provider) {
      console.error(" [Editor] Missing ydoc/provider props!");
      return;
    }

    provider.on("status", (e: any) => {
      console.log(" [Yjs WebRTC] Connection status:", e.status);
    });

    try {
      console.log(" [Editor] Initializing TipTap...");
      editor = new TipTapEditor({
        element: editorContainer,
        extensions: [
          StarterKit.configure({ history: false }),
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
              items: async ({ query }) => {
                console.log("[Mention] Searching users for query:", query);
                try {
                  const res = await trpc?.user?.searchByName?.query({
                    keyword: query || "",
                  });
                  console.log(" [Mention] Backend returned:", res);

                  if (!res || res.length === 0) {
                    console.warn(
                      " [Mention] No users found for query:",
                      query
                    );
                  }

                  return (
                    res?.map((u: any) => ({
                      id: u._id,
                      label: u.username,
                    })) ?? []
                  );
                } catch (err) {
                  console.error(
                    " [Mention Error] Cannot fetch user list:",
                    err
                  );
                  return [];
                }
              },
              render: () => {
                let popup: HTMLDivElement | null = null;

                return {
                  onStart: (props) => {
                    console.log(" [Mention.render] onStart:", props.items);
                    popup = document.createElement("div");
                    popup.setAttribute(
                      "data-theme",
                      document.documentElement.getAttribute("data-theme") ||
                        "classic"
                    );
                    updatePopup(props);
                    document.body.appendChild(popup);
                    // Sao chép toàn bộ biến màu hiện tại từ :root sang popup
                    const styles = getComputedStyle(document.documentElement);
                    popup.style.setProperty(
                      "--note-bg",
                      styles.getPropertyValue("--note-bg")
                    );
                    popup.style.setProperty(
                      "--note-text-color",
                      styles.getPropertyValue("--note-text-color")
                    );
                    popup.style.setProperty(
                      "--note-border",
                      styles.getPropertyValue("--note-border")
                    );
                  },
                  onUpdate(props) {
                    console.log("🔄 [Mention.render] onUpdate:", props.items);
                    updatePopup(props);
                  },
                  onKeyDown(props) {
                    if (props.event.key === "Escape") {
                      popup?.remove();
                      popup = null;
                      return true;
                    }
                    return false;
                  },
                  onExit() {
                    console.log(" [Mention.render] onExit");
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
                    el.classList.add("mention-item");
                    el.addEventListener("click", () => {
                      props.command({ id: item.id, label: item.label });
                    });
                    popup.appendChild(el);
                  });

                  // Position popup
                  const editorEl = editorContainer.getBoundingClientRect();
                  popup.style.position = "absolute";
                  popup.style.left = `${editorEl.left + 50}px`;
                  popup.style.top = `${editorEl.top + 80}px`;
                }
              },

              // Log các giai đoạn lifecycle của suggestion
              command: ({ editor, range, props }) => {
                console.log(" [Mention] command triggered for user:", props);
                editor
                  .chain()
                  .focus()
                  .insertContentAt(range, `@${props.label} `)
                  .run();
              },
              onStart: (props) => {
                console.log(
                  " [Mention] onStart triggered with props:",
                  props
                );
              },
              onUpdate: (props) => {
                console.log(
                  " [Mention] onUpdate triggered with query:",
                  props.query
                );
              },
              onKeyDown: (props) => {
                console.log(" [Mention] onKeyDown event:", props.event.key);
                return false; // giữ default
              },
              onExit: () => {
                console.log(" [Mention] onExit — suggestion closed");
              },
            },
          }),
        ],
        autofocus: true,
        content: "<p>Đang tải nội dung...</p>",
        onUpdate: ({ editor }) => {
          const html = editor.getHTML();
          noteStore.updateContent(html);
          console.log(
            " [Editor Update] Content changed, length:",
            html.length
          );
        },
      });

      console.log(" [Editor] Initialized successfully with TipTap.");

      editor.on("keydown", (event: KeyboardEvent) => {
        if (event.key === "@") {
          console.log(
            ' [Editor] User typed "@" → dispatch mentiontrigger event'
          );
          dispatch("mentiontrigger");
        }
      });
    } catch (err) {
      console.error(" [Editor] Error initializing TipTap:", err);
    }

    return cleanupEditor;
  });


  async function handleMentionSelect(user: any) {
    if (!editor) {
      console.warn("[MentionSelect] Editor instance not ready!");
      return;
    }

    console.log(" [MentionSelect] Đang mention user:", user);

    editor.commands.insertContent(`@${user.username} `);

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (!currentUser?.id) {
      console.error(
        " [MentionSelect] Không tìm thấy user hiện tại trong localStorage!"
      );
      return;
    }

    try {
      console.log("[MentionSelect] Gửi request addComment tới backend...");
      const result = await trpc?.note?.addComment?.mutate({
        noteId,
        authorId: currentUser.id,
        text: `@${user.username}`,
        type: "mention",
        mentionedUserId: user._id,
      });
      console.log(" [MentionSelect] Backend addComment phản hồi:", result);
    } catch (err) {
      console.error(" [MentionSelect] Gửi request addComment thất bại:", err);
    }
  }

  function cleanupEditor() {
    console.log(" [Editor] Cleaning up editor + Yjs resources...");
    try {
      editor?.destroy?.();
      console.log(" [Editor] TipTap instance destroyed.");
    } catch (err) {
      console.error(" [Editor] Error destroying editor:", err);
    }
  }

  onDestroy(cleanupEditor);
</script>

<div
  bind:this={editorContainer}
  class="prose max-w-none p-4 border rounded-md min-h-[400px] focus:outline-none transition-colors duration-300"
  style="
    background-color: var(--note-bg);
    color: var(--text-color);
    border-color: var(--note-border);
  "
></div>

<style>
  .ProseMirror {
    outline: none;
    min-height: 400px;
    background-color: var(--note-bg);
    color: var(--note-text-color);
  }

  .mention-popup {
  background-color: var(--note-bg);
  color: var(--note-text-color);
  border: 1px solid var(--note-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  padding: 4px;
  width: 160px;
  transition: background-color 0.3s, color 0.3s;
}

.mention-item {
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.mention-item:hover {
  background-color: color-mix(in srgb, var(--note-bg) 80%, var(--note-text-color));
}

</style>
