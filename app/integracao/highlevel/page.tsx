type PageProps = {
  searchParams: Promise<{ status?: string; location?: string }>;
};

const messages: Record<string, { title: string; text: string }> = {
  success: {
    title: "HighLevel conectado",
    text: "A subconta foi autorizada. Os próximos leads poderão ser enviados ao CRM.",
  },
  denied: {
    title: "Autorização cancelada",
    text: "Nenhuma alteração foi feita. Você pode tentar conectar novamente.",
  },
  invalid: {
    title: "Conexão expirada",
    text: "Por segurança, reinicie a conexão com o HighLevel.",
  },
  error: {
    title: "Não foi possível concluir",
    text: "Confira as credenciais e o endereço de retorno antes de tentar novamente.",
  },
};

export default async function HighLevelIntegrationPage({
  searchParams,
}: PageProps) {
  const { status = "" } = await searchParams;
  const message = messages[status] ?? {
    title: "Integração com o HighLevel",
    text: "Conecte a subconta que receberá os leads do simulador.",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#07182c",
        color: "#f8fafc",
      }}
    >
      <section
        style={{
          width: "min(100%, 560px)",
          padding: "40px",
          border: "1px solid #24415f",
          borderRadius: "20px",
          background: "#10263f",
          boxShadow: "0 24px 70px rgba(0,0,0,.3)",
        }}
      >
        <p style={{ color: "#55f4b0", fontWeight: 700, letterSpacing: ".08em" }}>
          SARESOLVE
        </p>
        <h1 style={{ fontSize: "32px", margin: "12px 0" }}>{message.title}</h1>
        <p style={{ color: "#c4d3e3", lineHeight: 1.6 }}>{message.text}</p>
        <a
          href="/api/integrations/highlevel/install"
          style={{
            display: "inline-block",
            marginTop: "24px",
            padding: "14px 20px",
            borderRadius: "10px",
            background: "#1f6df0",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          {status === "success" ? "Conectar outra subconta" : "Conectar HighLevel"}
        </a>
      </section>
    </main>
  );
}
