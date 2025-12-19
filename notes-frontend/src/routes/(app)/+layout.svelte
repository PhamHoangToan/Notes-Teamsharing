<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import { onMount, tick } from "svelte";
  import { goto } from "$app/navigation";
  import { trpc } from "$lib/trpc/client";
  import { connectNotificationSocket } from "$lib/utils/notificationClient";

  let user: any = null;
  let notes: any[] = [];
  let loading = true;
  let showSidebar = false;

  console.log(" [Layout] Script evaluated — showSidebar =", showSidebar);

  onMount(async () => {
    console.log(" [onMount] Layout mounted!");
    console.log(" Capacitor available?", !!window.Capacitor);

    const stored = localStorage.getItem("user");
    if (!stored) {
      console.warn(" [Auth] No user found → redirect login");
      goto("/login");
      return;
    }

    user = JSON.parse(stored);
    console.log(" User:", user);

    connectNotificationSocket();

    try {
      console.log(" Fetching notes...");
      notes = await trpc.note.list.query();
      console.log(" Notes loaded:", notes.length);
    } catch (err) {
      console.error(" [tRPC] Error loading notes:", err);
    } finally {
      loading = false;
      console.log(" [Layout] Done loading");
    }
  });

  async function toggleSidebar() {
    console.log(" [Click ☰ or ✕] Received!");
    showSidebar = !showSidebar;
    await tick();
    console.log(" [Sidebar] Toggled →", showSidebar ? "OPEN" : "CLOSED");
  }

  function testLog() {
    console.log(" [Test Button] Click event works!");
  }
</script>
<div class="flex flex-col min-h-dvh overflow-x-hidden">
  <div class="flex flex-1 min-h-0">
    <aside
      class="fixed md:static inset-y-0 left-0 w-64 shrink-0 overflow-hidden
             bg-[var(--sidebar-bg)] text-[var(--sidebar-text-color)]
             transition-transform duration-300 ease-in-out z-40 md:translate-x-0"
      class:translate-x-0={showSidebar}
      class:-translate-x-full={!showSidebar}
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-600 md:hidden">
        <h2 class="font-semibold text-lg">Ghi chú</h2>
        <button on:click={toggleSidebar} class="text-gray-200 hover:text-white text-2xl" type="button">✕</button>
      </div>

      <!-- Sidebar content fills height -->
      <Sidebar />
    </aside>

    {#if showSidebar}
      <div class="fixed inset-0 bg-black/50 z-30 md:hidden" on:click={toggleSidebar}></div>
    {/if}

    <main class="flex-1 min-w-0 min-h-0 overflow-y-auto p-4"
      style="background-color: var(--note-bg); color: var(--note-text-color);"
    >
      <div class="flex items-center justify-between mb-4 md:hidden mt-3">
        <button class="text-3xl text-gray-700" on:click={toggleSidebar} type="button">☰</button>
        <h1 class="text-lg font-semibold">TeamNotes</h1>
      </div>

      <slot />
    </main>
  </div>

  <footer class="h-12 bg-gray-100 border-t border-gray-300 flex items-center justify-center text-sm text-gray-600">
    © {new Date().getFullYear()} TeamNotes — All rights reserved
  </footer>
</div>


<style>
  :root {
    --sidebar-bg: #2e2e2e;
    --sidebar-text-color: #f9fafb;
    --note-bg: #ffffff;
    --note-text-color: #111827;
  }
</style>

<script context="module">
  // export const ssr = false;
</script>
