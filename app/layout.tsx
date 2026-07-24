import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host ?? "localhost:3000"}`;
  const socialImage = new URL("/og.png", baseUrl).toString();

  return {
    title: "SaResolve | Compare consórcio e financiamento",
    description:
      "Compare entrada, parcelas, prazo e custo total estimado de consórcio e financiamento para imóveis e automóveis.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "SaResolve | Compare antes de decidir",
      description:
        "Simule consórcio e financiamento para imóveis ou automóveis com números claros.",
      type: "website",
      locale: "pt_BR",
      siteName: "SaResolve",
      images: [{ url: socialImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "SaResolve | Compare antes de decidir",
      description:
        "Entrada, parcelas, prazo e custo total em uma única comparação.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
