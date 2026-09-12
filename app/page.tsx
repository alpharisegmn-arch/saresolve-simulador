import { ModernSimulator as Simulator } from "./modern-simulator";
import { Logo } from "./logo";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="SaResolve — início">
          <Logo light />
        </a>
        <nav aria-label="Navegação principal">
          <a className="header-cta" href="#simulador">
            Simular agora
          </a>
        </nav>
      </header>

      <section className="hero hero-modern" id="inicio">
        <div className="hero-modern-grid">
        <div className="hero-copy hero-modern-copy">
          <p className="hero-modern-kicker">Simule seu carro ou imóvel</p>
          <h1>
            Encontre o caminho mais <span className="hero-highlight">inteligente</span>{" "}
            para o seu sonho.
          </h1>
          <p className="hero-lead">
            Simule entrada, parcelas, prazo e custo total para seu imóvel ou
            automóvel. Veja como pode se encaixar no seu orçamento.
          </p>
          <div className="hero-trust" aria-label="Características da simulação">
            <span>Grátis</span>
            <span>Resultado imediato</span>
            <span>Sem compromisso</span>
          </div>
        </div>

        <div className="simulator-shell simulator-shell-modern" id="simulador">
          <Simulator />
        </div>
        </div>
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
