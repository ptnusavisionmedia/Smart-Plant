import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { WsProvider } from "@/lib/ws-context";
import { NotificationsCountProvider } from "@/lib/notifications-context";
import { ToastProvider } from "@/lib/toast-context";

export const metadata: Metadata = {
  title: "Smart Plant Emergency Detector",
  description: "Dasbor pemantauan dan deteksi darurat tanaman berbasis IoT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
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
