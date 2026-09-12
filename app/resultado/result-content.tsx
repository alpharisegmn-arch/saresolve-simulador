"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ComparisonResult } from "../finance";
import { loadSimulationResult } from "../result-storage";
import { Results } from "../simulator";

export function ResultContent() {
  const [result, setResult] = useState<ComparisonResult | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setResult(loadSimulationResult());
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  if (result === undefined) {
    return (
      <div className="result-page-state" role="status">
        <span className="result-page-loader" aria-hidden="true" />
        <p>Carregando seu comparativo...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-page-state result-page-empty">
        <p className="section-kicker">Resultado indisponível</p>
        <h1>Não encontramos uma simulação nesta aba.</h1>
        <p>Faça uma simulação para gerar seu comparativo personalizado.</p>
        <Link className="primary-button" href="/">
          Ir para o simulador <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Results result={result} />
      <aside className="result-next-step" aria-label="Próximo passo">
        <p className="result-kicker">Seu próximo passo</p>
        <h2>Seu plano pode começar a tomar forma agora.</h2>
        <p>
          Em breve, um especialista da SaResolve entrará em contato para
          transformar os dados da sua simulação em um plano personalizado e
          apresentar as condições especiais mais adequadas ao seu perfil.
        </p>
        <a
          href="https://www.instagram.com/saresolveoficial/"
          target="_blank"
          rel="noreferrer"
        >
          <svg className="instagram-icon" aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" className="instagram-icon-dot" />
          </svg>
          Siga a SaResolve no Instagram <span aria-hidden="true">→</span>
        </a>
      </aside>
    </>
  );
}
