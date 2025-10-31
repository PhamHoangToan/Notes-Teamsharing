<script lang="ts">
  import { trpc } from '$lib/trpc/client';
  import MentionDropdown from '$lib/components/MentionDropdown.svelte';

  export let noteId: string;
  let comments: any[] = [];
  let text = '';
  let showMentionDropdown = false;
  let users: any[] = [];

  async function loadComments() {
    comments = await trpc.note.comments.query({ noteId });
  }

  async function addComment() {
    if (!text.trim()) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    await trpc.note.addComment.mutate({
      noteId,
      authorId: user.id,
      text,
      type: 'comment',
    });
    text = '';
    await loadComments();
  }

  async function handleMentionSelect(user: any) {
  showMentionDropdown = false;
  text = text.replace(/@[^@\s]*$/, `@${user.username} `);
}

  async function searchMention(keyword: string) {
    if (!keyword.startsWith('@')) {
      users = [];
      return;
    }
    const q = keyword.slice(1);
    users = await trpc.user.searchByName.query({ keyword: q });
  }

  function onInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      showMentionDropdown = true;
      searchMention(lastWord);
    } else {
      showMentionDropdown = false;
    }
  }

  $: loadComments();
</script>

<div
  class="p-3 border-t transition-colors duration-300 relative"
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

  <div class="mt-2 flex gap-2 relative">
    <input
      bind:value={text}
      placeholder="Thêm bình luận..."
      on:input={onInput}
      class="border p-2 flex-1 rounded transition-colors duration-300"
      style="
        background-color: var(--note-bg);
        color: var(--note-text-color);
        border-color: var(--note-border);
      "
    />

    {#if showMentionDropdown && users.length > 0}
  <MentionDropdown {users} onSelect={handleMentionSelect} />
{/if}


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
