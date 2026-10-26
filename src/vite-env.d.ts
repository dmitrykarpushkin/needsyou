/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'demo' | 'http'
  readonly VITE_DATA_URL?: string
  readonly VITE_LIVE_FEED?: string
  readonly VITE_TIME_ZONE?: string
}
