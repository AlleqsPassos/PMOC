"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";
import { ActivateInviteForm } from "@/features/invites/components/activate-invite-form";

/**
 * A tela de login abriga os dois caminhos de entrada — quem já tem conta e
 * quem recebeu um código de convite — sem navegar para outra rota. O técnico
 * recebe do admin só o código (por WhatsApp, telefone, papel) e o digita aqui.
 */
export function LoginPanel() {
  const [mode, setMode] = useState<"login" | "invite">("login");
  const isLogin = mode === "login";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">
          {isLogin ? "Entrar" : "Ativar acesso"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isLogin
            ? "Acesse sua conta para continuar."
            : "Digite o código que você recebeu e crie sua senha."}
        </p>
      </div>

      {isLogin ? <LoginForm /> : <ActivateInviteForm />}

      <div className="flex flex-col gap-2 text-center text-sm">
        <button
          type="button"
          onClick={() => setMode(isLogin ? "invite" : "login")}
          className="text-primary font-medium hover:underline"
        >
          {isLogin ? "Tenho um código de convite" : "Já tenho conta — entrar"}
        </button>

        {isLogin && (
          <p className="text-muted-foreground">
            Primeira vez por aqui?{" "}
            <Link
              href="/criar-empresa"
              className="text-primary font-medium hover:underline"
            >
              Criar empresa
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
