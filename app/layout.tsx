import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ULTRON // Command Center',
  description: 'A cinematic personal command interface for missions, intelligence, and operator-approved actions.',
  applicationName: 'Ultron Command Center',
};

export const viewport: Viewport = {
  themeColor: '#090a0d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
