'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: '📊 Dashboard', exact: true },
  { href: '/enquiries', label: '📋 Enquiries' },
  { href: '/quotes', label: '📝 Quotes' },
  { href: '/projects', label: '📁 Projects' },
  null, // divider
  { href: '/design', label: '✏️ Design' },
  { href: '/production', label: '🏭 Production' },
  { href: '/qc', label: '🔍 QC' },
  { href: '/dispatch', label: '📦 Dispatch' },
  { href: '/site', label: '🏗️ Site' },
  null, // divider
  { href: '/items', label: '📍 Item Tracker' },
  { href: '/reports', label: '📄 Reports' },
  { href: '/settings', label: '⚙️ Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] flex flex-col">
      <nav className="p-3 space-y-0.5 flex-1">
        {navItems.map((item, i) => {
          if (item === null) {
            return <div key={`divider-${i}`} className="my-2 border-t border-gray-100" />
          }
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
