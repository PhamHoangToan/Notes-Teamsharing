<script lang="ts">
  import { onMount } from "svelte";
  import { trpc } from "$lib/trpc/client";

  export let noteId: string;
  let files: any[] = [];

  onMount(async () => {
    try {
      files = await trpc.file.list.query({ noteId });
    } catch (err) {
      console.error(" [AttachmentList] Lỗi tải file:", err);
    }
  });
</script>

<div class="mt-4 border-t pt-3 text-sm">
  <h3 class="font-medium mb-3 flex items-center gap-2"> Tệp đính kèm</h3>

  {#if files.length === 0}
    <p class="text-gray-400 italic">Chưa có tệp nào được tải lên.</p>
  {:else}
    <div class="space-y-1.5">
      {#each files as f}
        <div class="flex items-center justify-between border-b py-1.5">
          {#if f.mimeType?.startsWith("image/")}
  <a href={f.url} target="_blank" class="flex items-center gap-2">
    <img
      src={f.url}
      alt={f.fileName}
      class="w-12 h-12 object-cover rounded border"
    />
    <span class="text-blue-600 hover:underline">{f.fileName}</span>
  </a>
{:else}
  <a
    href={f.url}
    target="_blank"
    class="text-blue-600 hover:underline truncate max-w-[200px]"
  >
    {f.fileName}
  </a>
{/if}


          <span class="text-gray-500 text-xs ml-2 whitespace-nowrap">
            {(f.fileSize / 1024).toFixed(1)} KB
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .truncate {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
