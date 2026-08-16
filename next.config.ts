import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  /* config options here */
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Evita rodar o service worker em dev (facilita HMR/debug) — instalável
  // e testável a partir de `next build && next start`, e sempre ativo em
  // produção (Vercel).
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
