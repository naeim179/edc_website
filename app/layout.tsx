import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصتي التعليمية",
  description: "منصة تعليمية عربية",
};

const settingsScript = `
(function () {
  try {
    var language =
      localStorage.getItem("app-language") || "ar";

    var theme =
      localStorage.getItem("app-theme") || "light";

    if (
      theme !== "light" &&
      theme !== "dark" &&
      theme !== "eye"
    ) {
      theme = "light";
    }

    var root = document.documentElement;

    root.lang = language;
    root.dir =
      language === "en" ? "ltr" : "rtl";

    root.dataset.lang = language;
    root.dataset.theme = theme;
  } catch (error) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-lang="ar"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: settingsScript,
          }}
        />
      </head>

      <body>{children}</body>
    </html>
  );
}
