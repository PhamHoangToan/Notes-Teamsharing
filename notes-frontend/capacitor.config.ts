import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.notejoy.mobile',
  appName: 'teamNotes',
  webDir: 'build',
  bundledWebRuntime: false,
  server: {
    url: 'http://10.0.2.2:5173', //  dùng địa chỉ này cho emulator Android
    cleartext: true
  }
};

export default config;
