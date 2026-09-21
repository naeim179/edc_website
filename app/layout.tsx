import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: "منصتي التعليمية",
  description: "منصة تعليمية عربية",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // اللغة والمظهر محفوظان بكوكي، فتظهر الصفحة صحيحة من أول لحظة (بدون وميض)
  const cookieStore = await cookies();

  const language =
    cookieStore.get("app-language")?.value === "en" ? "en" : "ar";

  const themeCookie = cookieStore.get("app-theme")?.value;

  const theme =
    themeCookie === "dark" || themeCookie === "eye"
      ? themeCookie
      : "light";

  return (
    <html
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      data-lang={language}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
      </head>

      <body>
        <LanguageProvider initialLanguage={language}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
