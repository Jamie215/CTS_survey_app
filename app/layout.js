import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Carpal Tunnel Syndrome Diagnostic Survey",
  description: "Clinical measurement tool for CTS assessment and research",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.css"/>
      </head>
      <body>
        <script src="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js"></script>
        {children}
      </body>
    </html>
  );
}
