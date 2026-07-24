import Link from "next/link";
import { Logo } from "../logo";

export default function SimulationTerms() {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="brand" href="/" aria-label="Voltar para a SaResolve">
          <Logo />
        </Link>
        <p className="section-kicker">Transparência</p>
        <h1>Termos da Simulação</h1>
        <p className="legal-intro">
          A simulação é uma ferramenta comparativa e não constitui proposta,
          contrato, garantia de aprovação ou recomendação financeira.
        </p>
        <h2>Premissas do consórcio</h2>
        <ul>
          <li>Imóveis: 240 meses, administração de 24% e reserva de 2%.</li>
          <li>Automóveis: 60 meses, administração de 20% e reserva de 2%.</li>
          <li>Não são projetados seguros ou reajustes.</li>
          <li>O uso do crédito depende de contemplação e condições contratuais.</li>
        </ul>
        <h2>Premissas do financiamento</h2>
        <ul>
          <li>Imóveis: SAC, 420 meses e taxa efetiva de 11,08% ao ano.</li>
          <li>Automóveis: Price, 60 meses, taxa de 2,55% ao mês sem entrada e financiamento de 100% do crédito.</li>
          <li>Quando houver entrada automotiva informada, o valor será abatido do crédito e a estimativa usará taxa de 2,85% ao mês.</li>
          <li>Não são incluídos seguros, tarifas, tributos ou registros.</li>
        </ul>
        <h2>Variação dos valores</h2>
        <p>
          Condições reais variam por instituição, administradora, grupo, análise
          de crédito, perfil, data e contrato. Consulte toda a documentação
          antes de tomar uma decisão.
        </p>
        <h2>Banco Central</h2>
        <p>
          Administradoras de consórcio são fiscalizadas pelo Banco Central do
          Brasil. A SaResolve não é apresentada nesta página como instituição
          financeira ou administradora de consórcio.
        </p>
        <Link className="legal-back" href="/">← Voltar para a simulação</Link>
      </article>
    </main>
  );
}
