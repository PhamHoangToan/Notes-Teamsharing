<script lang="ts">
  import { trpc } from "$lib/trpc/client";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { connectNotificationSocket } from '$lib/utils/notificationClient';

  let email = "";
  let password = "";
  let loading = false;
  let error = "";

  onMount(() => {
    const user = localStorage.getItem("user");
    if (user) goto("/"); 
  });

  const handleLogin = async () => {
    error = '';
    if (!email.trim() || !password.trim()) {
      error = 'Vui lòng nhập đầy đủ thông tin';
      return;
    }

    try {
      loading = true;
      const res = await trpc.user.login.mutate({ email, password });
      localStorage.setItem('user', JSON.stringify(res));
      localStorage.setItem('userId', res.id);
      localStorage.setItem('username', res.username);

      console.log(' [Login] Lưu thông tin user:', res);
      connectNotificationSocket();
      goto('/');
    } catch (err: any) {
      console.error(' [Login] Lỗi đăng nhập:', err);
      error = err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
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

  <!-- Form chính -->
  <div class="w-full max-w-sm bg-white dark:bg-[#2a2a2a] rounded-xl shadow-md p-8 border border-gray-100 dark:border-gray-700">
    <!-- Social login -->
    <div class="space-y-3">
      <button class="w-full flex items-center justify-center border rounded-md py-2 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition">
        <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" class="w-5 h-5 mr-2" />
        <span>Sign in with Google</span>
      </button>
      <button class="w-full flex items-center justify-center border rounded-md py-2 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition">
        <img src="https://www.svgrepo.com/show/303145/microsoft-azure.svg" alt="Microsoft" class="w-5 h-5 mr-2" />
        <span>Sign in with Microsoft</span>
      </button>
      <button class="w-full flex items-center justify-center border rounded-md py-2 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition">
        <img src="https://www.svgrepo.com/show/349526/apple.svg" alt="Apple" class="w-5 h-5 mr-2" />
        <span>Sign in with Apple</span>
      </button>
    </div>

    <!-- Divider -->
    <div class="relative my-6">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-white dark:bg-[#2a2a2a] px-2 text-gray-500">or</span>
      </div>
    </div>

    <!-- Email / password -->
    {#if error}
      <p class="text-red-500 text-sm mb-3 text-center">{error}</p>
    {/if}

    <div class="space-y-3">
      <input
        type="email"
        placeholder="Email"
        bind:value={email}
        class="w-full border rounded-md p-2 dark:bg-[#1f1f1f] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      <input
        type="password"
        placeholder="Password"
        bind:value={password}
        class="w-full border rounded-md p-2 dark:bg-[#1f1f1f] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />

      <button
        on:click={handleLogin}
        disabled={loading}
        class="w-full bg-[#e53e3e] hover:bg-[#c53030] text-white font-medium py-2 rounded-md transition"
      >
        {loading ? "Đang đăng nhập..." : "Login"}
      </button>
    </div>

    <p class="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
      Need an account?
      <a href="/register" class="text-blue-600 hover:underline font-medium">Sign up</a>
      ·
      <a href="/forgot-password" class="text-blue-600 hover:underline font-medium">Forgot Password?</a>
    </p>
  </div>
</div>
