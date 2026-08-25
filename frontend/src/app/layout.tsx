import '@fontsource/alexandria/400.css';
import '@fontsource/alexandria/500.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/noto-kufi-arabic/600.css';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مِداد | خطّ الفهم',
  description: 'شرح واضح، تدريب في مكانه، ومسار تعلّم يجعل الخطوة التالية واضحة.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          تخطَّ إلى المحتوى
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
