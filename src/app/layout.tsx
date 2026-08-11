import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: 'FinanceOS — Personal Finance Hub',
  description: 'Premium personal finance tracking system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070710] font-sans text-white antialiased min-h-screen selection:bg-purple-500/30">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
