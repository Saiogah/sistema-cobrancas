// services/clipboard.service.ts — Cópia para área de transferência

/**
 * Copia um texto para a área de transferência.
 * Usa navigator.clipboard quando disponível, com fallback para execCommand.
 *
 * @param texto - Texto a ser copiado
 * @returns true se copiou com sucesso, false caso contrário
 */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Fallback para execCommand se clipboard API falhar
  }

  // Fallback: criar textarea temporária e usar execCommand
  try {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const sucesso = document.execCommand("copy");
    document.body.removeChild(textarea);
    return sucesso;
  } catch {
    return false;
  }
}
