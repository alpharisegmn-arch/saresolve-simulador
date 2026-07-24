# SaResolve — simulador de consórcio e financiamento

Landing page responsiva com captura de leads e comparação transparente entre
consórcio e financiamento para imóveis e automóveis.

## Configuração

Taxas, prazos, faixas de crédito, textos de consentimento e feature flags ficam
centralizados em `app/config.ts`.

Na implantação pela Vercel, a simulação funciona com o runtime nativo do
Next.js. O envio dos leads pode ser conectado a uma planilha, CRM ou banco de
dados por webhook.

Variáveis opcionais:

- `LEAD_WEBHOOK_URL`: endpoint HTTPS para receber novos leads.
- `LEAD_WEBHOOK_SECRET`: segredo para assinatura HMAC do webhook.
- `NEXT_PUBLIC_META_PIXEL_ID`: reservado para Meta Pixel.
- `NEXT_PUBLIC_GA_ID`: reservado para Google Analytics.
- `NEXT_PUBLIC_GOOGLE_ADS_ID`: reservado para Google Ads.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: reservado para a integração futura.

Scripts:

- `npm run dev`: prévia local.
- `npm run test`: testes financeiros.
- `npm run lint`: análise estática.
- `npm run build`: build de produção.
