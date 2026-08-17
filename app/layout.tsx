import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CABIN · 객실승무원 합격 루틴',
  description:
    '객실승무원 취업 준비를 매일의 합격 루틴으로 완성하는 AI 커리어 코칭 플랫폼',
  generator: 'v0.app',
  applicationName: 'CABIN',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CABIN',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0B1F33',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-navy">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
