import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "RentFlow — ERP para Locadoras",
    template: "%s | RentFlow",
  },
  description: "Sistema ERP completo para gestão de locadoras de máquinas, equipamentos e caminhões.",
  keywords: ["erp", "locadora", "máquinas", "equipamentos", "gestão", "contratos"],
  authors: [{ name: "RentFlow" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
