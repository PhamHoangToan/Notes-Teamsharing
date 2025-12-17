<script lang="ts">
  import { trpc } from '$lib/trpc/client';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let username = '';
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let success = '';

  const handleRegister = async () => {
  error = '';
  success = '';
  if (!username || !email || !password) {
    error = 'Vui lòng nhập đầy đủ thông tin';
    return;
  }

  try {
    loading = true;
    const res = await trpc.user.register.mutate({ username, email, password });
    success = 'Đăng ký thành công! Vui lòng đăng nhập.';
    
    setTimeout(() => goto('/login'), 1500);
  } catch (err: any) {
    error = err.message || 'Đăng ký thất bại';
  } finally {
    loading = false;
  }
};

</script>

<!-- ======================= GIAO DIỆN ======================= -->
<div class="min-h-screen flex flex-col items-center justify-center bg-[#f9fafb] dark:bg-[#1a1a1a] px-4">
  <!-- Logo + tiêu đề -->
  <div class="flex flex-col items-center mb-8">
    <div class="w-16 h-16 rounded-xl bg-[#f7f7f7] flex items-center justify-center shadow-sm">
      <span class="text-4xl font-bold text-red-600">n</span>
    </div>
    <h1 class="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-100">Notejoy</h1>
  </div>

  <!-- Form đăng ký -->
  <div class="w-full max-w-sm bg-white dark:bg-[#2a2a2a] rounded-xl shadow-md p-8 border border-gray-100 dark:border-gray-700">
    <h2 class="text-center text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
      Đăng ký tài khoản
    </h2>

    {#if error}
      <p class="text-red-500 text-sm mb-4 text-center">{error}</p>
    {/if}

    {#if success}
      <p class="text-green-600 text-sm mb-4 text-center">{success}</p>
    {/if}

    <div class="space-y-3">
      <input
        type="text"
        placeholder="Tên người dùng"
        bind:value={username}
        class="w-full border rounded-md p-2 dark:bg-[#1f1f1f] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      <input
        type="email"
        placeholder="Email"
        bind:value={email}
        class="w-full border rounded-md p-2 dark:bg-[#1f1f1f] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      <input
        type="password"
        placeholder="Mật khẩu"
        bind:value={password}
        class="w-full border rounded-md p-2 dark:bg-[#1f1f1f] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />

      <button
        on:click={handleRegister}
        disabled={loading}
        class="w-full bg-[#e53e3e] hover:bg-[#c53030] text-white font-medium py-2 rounded-md transition"
      >
        {loading ? 'Đang đăng ký...' : 'Đăng ký'}
      </button>
    </div>

    <p class="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
      Đã có tài khoản?
      <a href="/login" class="text-blue-600 hover:underline font-medium">Đăng nhập</a>
    </p>
  </div>
</div>
