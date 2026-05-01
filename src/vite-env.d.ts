/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MESHY_API_KEY?: string;
  readonly MESHY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
