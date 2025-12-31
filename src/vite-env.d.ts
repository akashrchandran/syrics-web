/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  readonly VITE_LYRICS_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
