import './globals.css';

export const metadata = {
  title: "Zendesk Sidebar App",
  description: "ZAF v2 + React + Next.js mini app"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}