import type { Metadata } from "next";
import { Source_Sans_3, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { WsProvider } from "@/lib/ws-context";
import { NotificationsCountProvider } from "@/lib/notifications-context";
import { ToastProvider } from "@/lib/toast-context";

// Adobe Spectrum's own typeface (Adobe Clean) is proprietary; Source Sans 3
// is the open-licensed face Spectrum's public docs recommend as a stand-in.
// Actually loading it (next/font) rather than only naming it in CSS is what
// makes the UI read as Spectrum instead of silently falling back to the OS's
// own UI font (Segoe UI / San Francisco), which has a visibly different
// character.
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-source-sans",
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-source-code-pro",
});

export const metadata: Metadata = {
  title: "Smart Plant Emergency Detector",
  description: "Dasbor pemantauan dan deteksi darurat tanaman berbasis IoT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sourceSans.variable} ${sourceCodePro.variable}`}>
      <body>
        <AuthProvider>
          <WsProvider>
            <NotificationsCountProvider>
              <ToastProvider>{children}</ToastProvider>
            </NotificationsCountProvider>
          </WsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
