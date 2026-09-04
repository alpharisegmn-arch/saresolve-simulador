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

  return <Results result={result} />;
}
