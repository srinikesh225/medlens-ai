/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string
  readonly VITE_EXTRACTION_ENDPOINT?: string
  readonly VITE_EXTRACTION_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
