import "./globals.css";

export const metadata = {
  title: "MiglioriAmo Studio",
  description: "Ambiente di lavoro interno MiglioriAmo — contesti clienti da Dropbox e strumenti AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
