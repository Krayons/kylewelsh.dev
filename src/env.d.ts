/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full WebSocket URL for the terminal proxy, e.g. wss://term.kylewelsh.dev/ws */
  readonly VITE_TERM_WS_URL?: string
  /** HTTP base for health checks, e.g. https://term.kylewelsh.dev */
  readonly VITE_TERM_HTTP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
