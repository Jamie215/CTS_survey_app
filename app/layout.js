import "./globals.css";

export const metadata = {
  title: "Carpal Tunnel Syndrome Diagnostic Survey",
  description: "Clinical measurement tool for CTS assessment and research",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.js.iife.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@latest/dist/driver.css"/>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
