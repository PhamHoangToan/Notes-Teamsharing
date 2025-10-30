<script lang="ts">
  import { trpc } from '$lib/trpc/client';
  export let onSelect: (user: any) => void;

  let keyword = '';
  let users: any[] = [];

  async function search() {
    if (!keyword.startsWith('@')) return;
    const q = keyword.slice(1);
    users = await trpc.user.searchByName.query({ keyword: q });
  }

  $: search();
</script>

{#if users.length > 0}
  <ul
  class="absolute border rounded shadow p-2 w-64 transition-colors duration-300"
  style="
    background-color: var(--note-bg);
    color: var(--note-text-color);
    border-color: var(--note-border);
  "
>
  {#each users as u}
    <li
      class="p-2 cursor-pointer rounded"
      style="transition: background-color 0.2s"
      on:click={() => onSelect(u)}
      on:mouseenter={(e) => (e.currentTarget.style.backgroundColor = 'var(--note-border)')}
      on:mouseleave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      @{u.username}
    </li>
  {/each}
</ul>

{/if}
