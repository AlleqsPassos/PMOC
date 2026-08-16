/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// Service worker do app shell — cache de assets/documentos (NetworkFirst
// para navegações e chamadas REST, CacheFirst para estáticos, via
// defaultCache do @serwist/next). NÃO é o mecanismo de dados offline: isso
// é responsabilidade da camada Dexie/IndexedDB (src/lib/offline/, Fase 6) —
// cache HTTP não sustenta escrita offline. Ver seção 11/12 do documento de
// arquitetura.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
