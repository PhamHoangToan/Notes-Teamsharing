<script lang="ts">
  import { trpc } from '$lib/trpc/client';
  export let noteId: string;
  let comments: any[] = [];
  let text = '';


  async function loadComments() {
    comments = await trpc.note.comments.query({ noteId });
  }

  async function addComment() {
    if (!text.trim()) return;
    await trpc.note.addComment.mutate({
      noteId,
      authorId: localStorage.getItem('userId'),
      text,
      type: 'comment',
    });
    text = '';
    await loadComments();
  }

  $: loadComments();
</script>

<div class="p-3 border-t transition-colors duration-300"
  style="
    background-color: var(--note-bg);
    color: var(--note-text-color);
    border-color: var(--note-border);
  "
>
  <h3 class="font-semibold mb-2">Bình luận</h3>
  {#each comments as c}
    <div class="mb-2">
      <p class="text-sm" style="color: var(--note-text-color)">{c.text}</p>
    </div>
  {/each}

  <div class="mt-2 flex gap-2">
    <input
      bind:value={text}
      placeholder="Thêm bình luận..."
      class="border p-2 flex-1 rounded transition-colors duration-300"
      style="
        background-color: var(--note-bg);
        color: var(--note-text-color);
        border-color: var(--note-border);
      "
    />
    <button
      on:click={addComment}
      class="px-3 py-2 rounded transition-colors duration-300"
      style="
        background-color: var(--note-text-color);
        color: var(--note-bg);
      "
    >
      Gửi
    </button>
  </div>
</div>
