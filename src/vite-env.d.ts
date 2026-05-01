/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MESHY_API_KEY?: string;
  readonly VITE_MESHY_MODE?: "mock" | "proxy" | "direct";
  readonly VITE_APP_ENV?: "development" | "develop" | "production" | "test";
  readonly VITE_TLDRAW_LICENSE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
