<!-- src/routes/+layout.svelte -->
<script>
  import "../app.css";
  import "bootstrap-icons/font/bootstrap-icons.css";
  import { onMount } from "svelte";

  onMount(() => {
    if (typeof window !== "undefined") {
      console.log("🧩 [DEBUG] App layout mounted");
      console.log("🌍 window.Capacitor =", window.Capacitor);

      if (!window.Capacitor) {
        console.error("❌ Capacitor chưa được khởi tạo — có thể app đang chạy web hoặc load quá sớm");
      } else {
        console.log("✅ Capacitor đã sẵn sàng!");
        console.log("🔹 Các plugin khả dụng:", window.Capacitor.Plugins);
      }
    } else {
      console.warn("⚠️ window chưa tồn tại (SSR phase) — bỏ qua log Capacitor");
    }
  });
</script>

<slot />
