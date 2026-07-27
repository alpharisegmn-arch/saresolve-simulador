import Link from "next/link";
import { Logo } from "../logo";

export default function PrivacyPolicy() {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="brand" href="/" aria-label="Voltar para a SaResolve">
          <Logo />
        </Link>
        <p className="section-kicker">Privacidade</p>
        <h1>Política de Privacidade</h1>
        <p className="legal-intro">
          Esta política explica, em linguagem simples, como os dados informados
          na simulação são utilizados pela SaResolve.
        </p>
        <h2>Dados coletados</h2>
        <p>
          Podemos coletar nome, número de WhatsApp, renda familiar, valor
          disponível, dados da simulação e informações de origem da visita,
          como parâmetros de campanha.
        </p>
        <h2>Finalidades</h2>
        <p>
          Os dados são usados para calcular e vincular o comparativo solicitado,
          enviar os dados da simulação pelo WhatsApp, compreender a origem dos
          acessos, prevenir abuso e permitir contato relacionado às modalidades
          consultadas.
        </p>
        <h2>Compartilhamento</h2>
        <p>
          Os dados poderão ser compartilhados apenas com fornecedores
          necessários à operação da página e, quando aplicável, parceiros
          responsáveis pelo atendimento solicitado. Não comercializamos listas
          de dados pessoais.
        </p>
        <h2>Armazenamento e segurança</h2>
        <p>
          Aplicamos medidas técnicas e organizacionais proporcionais para
          proteger os dados. Nenhum método é absolutamente infalível, por isso
          revisamos periodicamente nossos controles.
        </p>
        <h2>Direitos do titular</h2>
        <p>
          O titular poderá solicitar confirmação de tratamento, acesso,
          correção, eliminação quando cabível e outras providências previstas
          na legislação aplicável. O canal formal será incluído antes da
          publicação comercial definitiva.
        </p>
        <h2>Atualizações</h2>
        <p>
          Esta versão é datada de 24 de julho de 2026 e deverá passar por revisão
          jurídica antes da operação comercial definitiva.
        </p>
        <Link className="legal-back" href="/">← Voltar para a simulação</Link>
      </article>
    </main>
  );
}
