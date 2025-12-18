<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import "../app.css";
  import "bootstrap-icons/font/bootstrap-icons.css";
  import { onMount } from "svelte";

  import SettingsModal from "$lib/components/SettingsModal.svelte";
  import { settingsModalOpen } from "$lib/stores/settingsModal";

  onMount(() => {
    if (typeof window !== "undefined") {
      console.log("[DEBUG] App layout mounted");
    }
  });
</script>

<slot />

{#if $settingsModalOpen}
  <SettingsModal onClose={() => settingsModalOpen.set(false)} />
{/if}
