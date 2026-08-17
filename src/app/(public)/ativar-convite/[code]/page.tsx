import type { Metadata } from "next";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { ActivateInviteForm } from "@/features/invites/components/activate-invite-form";

export const metadata: Metadata = { title: "Ativar convite — PMOC+" };

export default async function AtivarConvitePage(
  props: PageProps<"/ativar-convite/[code]">,
) {
  const { code } = await props.params;

  return (
    <AuthPageShell
      title="Ativar acesso"
      description="Defina suas credenciais para começar a usar o PMOC+."
    >
      <ActivateInviteForm defaultCode={code} />
    </AuthPageShell>
  );
}
