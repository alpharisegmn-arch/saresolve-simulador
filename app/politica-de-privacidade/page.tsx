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
          como parâmetros de campanha. Também poderemos coletar dados técnicos
          de navegação, como endereço IP, navegador, dispositivo, páginas
          acessadas e identificadores armazenados por cookies e tecnologias
          semelhantes.
        </p>
        <h2>Finalidades</h2>
        <p>
          Os dados são usados para calcular e vincular o comparativo solicitado,
          enviar os dados da simulação pelo WhatsApp, compreender a origem dos
          acessos, prevenir abuso e permitir contato relacionado às modalidades
          consultadas. Informações técnicas também podem ser utilizadas para
          medir o desempenho de campanhas e melhorar a experiência no site.
        </p>
        <h2>Cookies e tecnologias de medição</h2>
        <p>
          O site pode utilizar cookies e tecnologias semelhantes. Cookies
          necessários permitem o funcionamento e a segurança da página.
          Cookies de medição e publicidade podem ser usados para entender a
          origem das visitas, medir conversões e apresentar anúncios mais
          relevantes em plataformas de terceiros.
        </p>
        <p>
          Quando habilitado, o Pixel da Meta poderá registrar eventos de
          navegação e de conclusão da simulação para atribuição de campanhas e
          mensuração de resultados. Esses eventos não são usados para divulgar
          publicamente os dados preenchidos no formulário. As configurações do
          navegador permitem bloquear ou apagar cookies, embora isso possa
          limitar algumas funcionalidades ou a medição do site.
        </p>
        <h2>Compartilhamento</h2>
        <p>
          Os dados poderão ser compartilhados apenas com fornecedores
          necessários à operação da página e, quando aplicável, parceiros
          responsáveis pelo atendimento solicitado. Para medição e publicidade,
          dados técnicos e identificadores poderão ser tratados por plataformas
          como a Meta, conforme as configurações adotadas e a legislação
          aplicável. Não comercializamos listas de dados pessoais.
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
          Esta versão é datada de 29 de agosto de 2026 e deverá passar por
          revisão jurídica periódica, especialmente antes da ativação de novas
          ferramentas de publicidade ou medição.
        </p>
        <Link className="legal-back" href="/">← Voltar para a simulação</Link>
      </article>
    </main>
  );
}
