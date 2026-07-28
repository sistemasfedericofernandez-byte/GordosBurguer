import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });

export const metadata: Metadata = {
  title: "GORDO'S Sistema",
  description: "Sistema de pedidos, caja, insumos y envíos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={anton.variable}>
      <body>{children}</body>
    </html>
  );
}
