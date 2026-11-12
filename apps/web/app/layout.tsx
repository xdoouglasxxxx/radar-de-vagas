import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Radar de Vagas" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
