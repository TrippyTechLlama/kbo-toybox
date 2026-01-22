import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'kbo-toybox',
  description: 'NestJS API + Next.js frontend starter',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <a className="brand" href="/">kbo-toybox</a>
            <nav>
              <a href="/">Home</a>
              <a href="/companies">Companies</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
