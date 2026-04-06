/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_VK_URL: string;
  readonly VITE_DISCOGS_API_URL: string;
  readonly VITE_API_DEEZER_URL: string;
  readonly VITE_MB_API: string;
  readonly VITE_SPOTIFY_WEB_URL: string;
  readonly VITE_SPOTIFY_MOBILE_URL: string;
  readonly VITE_DEEZER_WEB_URL: string;
  readonly VITE_DEEZER_MOBILE_URL: string;
  readonly VITE_YOUTUBE_MUSIC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
