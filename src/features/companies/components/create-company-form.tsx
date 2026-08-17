"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  createCompanyAndAdmin,
  type CreateCompanyState,
} from "@/features/companies/actions";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-destructive text-sm">{messages[0]}</p>;
}

export function CreateCompanyForm() {
  const [state, action, pending] = useActionState<
    CreateCompanyState,
    FormData
  >(createCompanyAndAdmin, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="corporateName">Razão social</Label>
        <Input id="corporateName" name="corporateName" required />
        <FieldError messages={state?.fieldErrors?.corporateName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tradeName">Nome fantasia (opcional)</Label>
        <Input id="tradeName" name="tradeName" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cnpj">CNPJ (opcional)</Label>
        <Input id="cnpj" name="cnpj" />
      </div>

      <div className="border-border my-1 border-t" />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adminFullName">Seu nome completo</Label>
        <Input id="adminFullName" name="adminFullName" required />
        <FieldError messages={state?.fieldErrors?.adminFullName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Seu e-mail</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError messages={state?.fieldErrors?.email} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
        />
        <FieldError messages={state?.fieldErrors?.password} />
      </div>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Criando…" : "Criar empresa"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
