import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'C5 OS - Concept 5 Kitchen & Wood Industries',
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
