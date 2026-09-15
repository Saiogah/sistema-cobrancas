// hooks/useTheme.ts — Aplica a preferência de aparência (Claro/Escuro/Sistema) ao <html>.
//
// Fonte da preferência: mesma store 'configuracoes' (via useConfig), campo 'tema'.
// "Sistema" segue prefers-color-scheme e reage a mudanças em tempo real (sem polling —
// é um listener nativo de media query). Nenhuma lógica de negócio é afetada.
import { useEffect } from "react";
import { useConfig } from "./useConfig";

function aplicarClasse(escuro: boolean) {
  document.documentElement.classList.toggle("dark", escuro);
}

export function useTheme(): void {
  const { config } = useConfig();
  const tema = config?.tema ?? "system";

  useEffect(() => {
    if (tema === "light") {
      aplicarClasse(false);
      return;
    }
    if (tema === "dark") {
      aplicarClasse(true);
      return;
    }
    // "system": aplica o estado atual do SO e acompanha mudanças ao vivo
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    aplicarClasse(media.matches);
    const listener = (e: MediaQueryListEvent) => aplicarClasse(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [tema]);
}
