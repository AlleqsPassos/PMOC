/** Link é sempre relativo à origem que serviu a página — funciona igual em dev e produção sem hardcode. */
export function inviteUrl(code: string): string {
  if (typeof window === "undefined") return `/ativar-convite/${code}`;
  return `${window.location.origin}/ativar-convite/${code}`;
}
