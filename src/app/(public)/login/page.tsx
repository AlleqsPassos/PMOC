import type { Metadata } from "next";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar — PMOC+" };

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Entrar"
      description="Acesse sua conta para continuar."
    >
      <LoginForm />
    </AuthPageShell>
  );
}
