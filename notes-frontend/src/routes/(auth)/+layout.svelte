<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  onMount(() => {
    const user = localStorage.getItem("user");
    if (user) goto("/"); 
  });
</script>

<main class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1e1e1e] transition-colors duration-300">
  <slot />
</main>
