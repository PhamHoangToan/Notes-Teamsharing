<script lang="ts">
  // ✅ Nhận users từ component cha (ví dụ CommentList hoặc NotePage)
  export let users: any[] = [];
  export let onSelect: (user: any) => void;
</script>

{#if users.length > 0}
  <ul
    class="absolute border rounded shadow p-2 w-64 z-50 transition-colors duration-300"
    style="
      background-color: var(--note-bg);
      color: var(--note-text-color);
      border-color: var(--note-border);
    "
  >
    {#each users as u}
      <li
        class="p-2 cursor-pointer rounded transition"
        on:click={() => onSelect(u)}
        on:mouseenter={(e) =>
          (e.currentTarget.style.backgroundColor = 'var(--note-border)')}
        on:mouseleave={(e) =>
          (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        @{u.username}
      </li>
    {/each}
  </ul>
{/if}
