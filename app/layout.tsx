import './globals.css';

export const metadata = {
  title: 'The Camp Brand · Projects',
  description: 'Talent tracker for The Camp Brand',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
