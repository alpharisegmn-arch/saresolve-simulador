import type { Metadata } from "next";
import { Logo } from "../logo";
import { ResultContent } from "./result-content";

export const metadata: Metadata = {
  title: "Resultado da simulação | SaResolve",
  description:
    "Confira o comparativo estimado entre consórcio e financiamento.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResultPage() {
  return (
    <main className="result-page">
      <header className="result-page-header" aria-label="SaResolve">
        <div className="brand" aria-label="SaResolve">
          <Logo light />
        </div>
      </header>

      <ResultContent />

      <footer className="result-page-footer">
        <div className="footer-links">
          <a href="/politica-de-privacidade">Política de Privacidade</a>
          <a href="/termos-da-simulacao">Termos da Simulação</a>
        </div>
        <p className="footer-note">
          © {new Date().getFullYear()} SaResolve. Esta simulação é estimativa e
          não constitui proposta ou garantia de aprovação.
        </p>
      </footer>
    </main>
  );
}
