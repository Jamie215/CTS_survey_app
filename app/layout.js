import "./globals.css";

export const metadata = {
  title: "Carpal Tunnel Syndrome Diagnostic Survey",
  description: "Clinical measurement tool for CTS assessment and research",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
