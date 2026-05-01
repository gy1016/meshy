/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MESHY_API_KEY?: string;
  readonly VITE_APP_ENV?: "development" | "develop" | "production" | "test";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
