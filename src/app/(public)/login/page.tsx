import type { Metadata } from "next";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { LoginPanel } from "@/features/auth/components/login-panel";

export const metadata: Metadata = { title: "Entrar — PMOC+" };

export default function LoginPage() {
  // Sem title/description no shell: o LoginPanel controla o cabeçalho, que
  // muda conforme a pessoa está entrando ou ativando um convite.
  return (
    <AuthPageShell>
      <LoginPanel />
    </AuthPageShell>
  );
}
