import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPOS QUEST A2 · Aventura de repaso para la oposición de Gestión del Estado",
  description:
    "Videojuego de plataformas estilo años 90 para repasar el temario del Cuerpo de Gestión de la Administración Civil del Estado (A2): 6 mundos, jefes finales, tests y simulacro de examen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0820",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
