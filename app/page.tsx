import { Simulator } from "./simulator";
import { Logo } from "./logo";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="SaResolve — início">
          <Logo light />
        </a>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a className="header-cta" href="#simulador">
            Simular agora
          </a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <div className="eyebrow">
            <span aria-hidden="true" />
            Simule o crédito para seu carro ou imóvel
          </div>
          <h1>
            Simule as melhores modalidades de crédito{" "}
            <span>antes de decidir.</span>
          </h1>
          <p className="hero-lead">
            Simule entrada, parcelas, prazo e custo total para seu imóvel ou
            automóvel. Veja as diferenças com números claros.
          </p>
          <div className="hero-trust" aria-label="Características da simulação">
            <span>Grátis</span>
            <span>Resultado imediato</span>
            <span>Sem compromisso</span>
          </div>
        </div>

        <div className="simulator-shell" id="simulador">
          <div className="simulator-heading">
            <span className="step-index">01</span>
            <div>
              <p>Comece por aqui</p>
              <h2>Qual crédito você procura?</h2>
            </div>
          </div>
          <Simulator />
        </div>
      </section>

      <div id="results-portal" />

      <section className="clarity-strip" aria-label="Itens da comparação">
        <p>Uma comparação. Quatro respostas essenciais.</p>
        <div>
          <span><b>01</b> Entrada</span>
          <span><b>02</b> Parcelas</span>
          <span><b>03</b> Prazo</span>
          <span><b>04</b> Custo total</span>
        </div>
      </section>

      <section className="how-section" id="como-funciona">
        <div className="section-heading">
          <p className="section-kicker">Como funciona</p>
          <h2>Da intenção aos números em menos de um minuto.</h2>
          <p>
            Sem cenários genéricos. A comparação é calculada a partir do valor
            que você realmente procura.
          </p>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <div className="step-line" aria-hidden="true" />
            <h3>Informe seu objetivo</h3>
            <p>Escolha imóvel ou automóvel e diga o valor que procura.</p>
          </li>
          <li>
            <span>02</span>
            <div className="step-line" aria-hidden="true" />
            <h3>Veja lado a lado</h3>
            <p>Comparamos entrada, parcelas, prazos e custos estimados.</p>
          </li>
          <li>
            <span>03</span>
            <div className="step-line" aria-hidden="true" />
            <h3>Decida com clareza</h3>
            <p>Avalie os números sem selos ou recomendações predefinidas.</p>
          </li>
        </ol>
      </section>

      <footer>
        <div className="footer-brand">
          <a className="brand brand-light" href="#inicio">
            <Logo light />
          </a>
          <p>Compare modalidades de crédito com números claros.</p>
        </div>
        <div className="footer-links">
          <a href="/politica-de-privacidade">Política de Privacidade</a>
          <a href="/termos-da-simulacao">Termos da Simulação</a>
        </div>
        <p className="footer-note">
          © {new Date().getFullYear()} SaResolve. Administradoras de consórcio
          são fiscalizadas pelo Banco Central do Brasil. A SaResolve não é uma
          instituição financeira ou administradora de consórcio.
        </p>
      </footer>
    </main>
  );
}
