import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Concept 5 OS',
  description: 'Project Management System for Concept 5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
