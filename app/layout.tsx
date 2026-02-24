import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IARA — Painel da Clínica",
  description: "Gerencie sua assistente virtual IARA: conversas, agendamentos, habilidades e créditos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
