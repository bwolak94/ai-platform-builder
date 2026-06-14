/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_URL: string | undefined;
  readonly VITE_APP_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
