"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// O prompt nativo do navegador para instalar PWA é frequentemente suprimido
// (varia por browser/heurística) — por isso capturamos beforeinstallprompt e
// oferecemos uma affordance própria em vez de depender só do navegador.
// Prioriza a experiência do técnico em campo (instalar no celular ajuda a
// abrir o app como tela cheia, sem a barra de endereço).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!deferredPrompt) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
      }}
    >
      <Download className="size-4" />
      Instalar app
    </Button>
  );
}
