import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'UTBK 2026 - Persiapan Adik',
  description: 'Platform latihan UTBK lengkap',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}