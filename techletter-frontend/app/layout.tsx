import './globals.css';
import type { Metadata } from 'next';
import BottomNav from '@/components/layout/BottomNav';
import { ThemeProvider } from '@/components/ThemeProvider';
import Chatbot from '@/components/common/Chatbot';

export const metadata: Metadata = {
  title: 'TechLetter',
  description: 'IT 트렌드를 한눈에',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Chatbot />
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
