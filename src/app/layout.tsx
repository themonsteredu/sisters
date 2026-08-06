import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoProvider } from "@/components/providers/demo-provider";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "Sisters · 우리 가족 학습 매니저", template: "%s · Sisters" },
  description: "계획부터 인증, 테스트, 보완학습까지 이어지는 가족 학습관리 서비스",
  applicationName: "Sisters",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Sisters" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#6d5ce8" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <DemoProvider>{children}</DemoProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
