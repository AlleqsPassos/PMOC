import type { Metadata } from "next";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { CreateCompanyForm } from "@/features/companies/components/create-company-form";

export const metadata: Metadata = { title: "Criar empresa — PMOC+" };

export default function CriarEmpresaPage() {
  return (
    <AuthPageShell
      title="Criar empresa"
      description="Cadastre sua empresa e crie a conta de administrador."
    >
      <CreateCompanyForm />
    </AuthPageShell>
  );
}
