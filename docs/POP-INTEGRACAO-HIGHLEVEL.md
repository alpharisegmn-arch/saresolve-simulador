# POP — Integração SaResolve com HighLevel

## 1. Objetivo

Conectar o simulador SaResolve a uma subconta do HighLevel para:

- criar ou atualizar o contato pelo telefone;
- aplicar as tags corretas;
- criar a oportunidade no funil definido;
- preencher os campos personalizados da oportunidade;
- manter os tokens OAuth seguros e renováveis.

## 2. Estrutura usada

- Aplicação: Next.js hospedada na Vercel.
- Banco: Postgres/Neon para armazenar a instalação OAuth criptografada.
- CRM: HighLevel, com aplicativo do Marketplace direcionado a subcontas.
- Callback: `/api/integrations/highlevel/callback`.
- Página de conexão: `/integracao/highlevel`.

## 3. Escopos mínimos do aplicativo

Ativar somente:

- `contacts.readonly`
- `contacts.write`
- `locations.readonly`
- `locations/customFields.readonly`
- `opportunities.readonly`
- `opportunities.write`

O escopo `locations/customFields.write` só é necessário se a aplicação também
for criar ou alterar campos personalizados pela API.

## 4. Configuração do aplicativo no Marketplace

1. Colocar a versão em Draft.
2. Cadastrar a Redirect URL exata:
   `https://DOMINIO/api/integrations/highlevel/callback`
3. Conferir os seis escopos mínimos.
4. Publicar a nova versão.
5. Quando a alteração mantiver compatibilidade, usar versão Minor.
6. Se o portal exigir Major por alteração de contrato ou escopos, seguir a
   recomendação exibida.

Observação: uma versão Live não é editada diretamente. As alterações devem ser
feitas em Draft e publicadas como nova versão.

## 5. Client ID e Client Secret

1. Em **Manage > Secrets**, criar um novo Client Key.
2. Copiar o Client ID e o Client Secret imediatamente.
3. Marcar o novo Client Key como padrão.
4. Atualizar as variáveis na Vercel.
5. Revogar a chave anterior depois de confirmar a nova.

Nunca registrar o Client Secret em código, documentação, prints públicos ou
GitHub.

Para variáveis sensíveis da Vercel, usar a ação **Rotate**, não apenas Edit.
Depois da rotação, sempre fazer um novo deployment.

## 6. Variáveis da Vercel

Obrigatórias:

- `NEXT_PUBLIC_APP_URL`
- `GHL_CLIENT_ID`
- `GHL_CLIENT_SECRET`
- `GHL_REDIRECT_URI`
- `GHL_TOKEN_ENCRYPTION_KEY`
- `DATABASE_URL`
- `GHL_PIPELINE_NAME`
- `GHL_PIPELINE_STAGE_NAME`

Valores atuais de referência:

- Pipeline: `Funil de Leads (simulador)`
- Etapa: `Novo Lead`

As variáveis devem estar disponíveis em Production e Preview. Após qualquer
alteração, executar um redeploy.

## 7. OAuth

O endpoint de token atual é:

`POST https://services.leadconnectorhq.com/oauth/token`

Usar:

- Header `Version: v3`
- `Content-Type: application/x-www-form-urlencoded`
- parâmetros camelCase:
  - `clientId`
  - `clientSecret`
  - `grantType`
  - `code` ou `refreshToken`
  - `userType`
  - `redirectUri`

Não enviar simultaneamente os nomes antigos com underscore. Isso gera resposta
422.

Erros conhecidos:

- `401 Invalid client credentials`: Client ID ou Client Secret divergente.
- `422 property client_id should not exist`: parâmetros legados duplicados.
- `status=invalid`: state/cookie expirado ou callback iniciado fora do fluxo.

## 8. Instalação na subconta

1. Abrir `/integracao/highlevel`.
2. Clicar em **Conectar HighLevel**.
3. Conferir os escopos.
4. Selecionar a subconta desejada.
5. Confirmar a mensagem **HighLevel conectado**.

Os tokens são criptografados antes de serem armazenados no Postgres.

## 9. Funil e campos personalizados

Criar os campos na modalidade **Oportunidade**, dentro da pasta `SIMULAÇÃO`:

- Categoria do Crédito
- Possui Entrada
- Valor de Entrada
- Valor do Crédito
- Parcela Ideal
- Renda Média Familiar

Tipo recomendado: **Linha única**.

O simulador consulta os campos de oportunidade pela API e os identifica por
nome/chave, sem depender de IDs fixos.

Regra do campo **Possui Entrada**:

- escolha “Não”: `Não`
- escolha “Sim”: `Sim — R$ valor informado`

O campo **Valor de Entrada** recebe separadamente o valor formatado, inclusive
`R$ 0,00` quando não houver entrada.

## 10. Tags

Sempre aplicar:

- `lead simulador saresolve`

Aplicar uma tag de categoria:

- imóvel: `[imóvel]`
- automóvel: `[auto]`

Não criar tags alternativas como “crédito imobiliário” ou “crédito
automotivo”.

## 11. Validação obrigatória

Realizar dois testes:

1. Imóvel com entrada.
2. Automóvel sem entrada.

Em cada teste, conferir:

- contato criado/atualizado com nome e telefone;
- tags corretas, sem duplicidade;
- oportunidade no funil e etapa corretos;
- valor monetário igual ao crédito desejado;
- seis campos personalizados preenchidos;
- “Possui Entrada” seguindo a regra definida;
- resultado exibido normalmente ao lead.

## 12. Checklist de manutenção

- O callback da versão Live continua correto?
- O Client Key padrão é o mesmo configurado na Vercel?
- A variável sensível foi rotacionada e o projeto redeployado?
- Os escopos publicados continuam mínimos?
- O pipeline ou a etapa foram renomeados?
- Os campos continuam no modelo Oportunidade?
- A conexão OAuth ainda está ativa?
- Os logs da Vercel apresentam respostas 2xx do HighLevel?

