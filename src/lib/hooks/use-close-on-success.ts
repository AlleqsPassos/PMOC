import { useState } from "react";

/**
 * Fecha um Dialog quando o useActionState associado retorna sucesso.
 *
 * Não usa useEffect de propósito: setState síncrono dentro de um effect
 * dispara react-hooks/set-state-in-effect (cascading renders). Em vez
 * disso, usa o padrão "ajustar estado durante a renderização" documentado
 * em react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes —
 * guarda o último `state` já tratado e reage à mudança no próprio corpo do
 * componente, não num effect.
 */
export function useCloseOnSuccess<T extends { success?: boolean } | undefined>(
  state: T,
  onClose: () => void,
) {
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) onClose();
  }
}
