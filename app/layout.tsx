import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ניהול בניית הבית',
  description: 'מערכת ניהול מקיפה לפרויקט בניית הבית שלך',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} font-sans bg-sand-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
