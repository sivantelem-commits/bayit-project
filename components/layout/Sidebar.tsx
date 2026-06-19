'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Wallet, CalendarDays, HardHat,
  FileText, Camera, Home, BookOpen, Settings,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/dashboard',     label: 'דאשבורד',        icon: LayoutDashboard },
  { href: '/budget',        label: 'תקציב והוצאות',  icon: Wallet },
  { href: '/timeline',      label: 'לוח זמנים',      icon: CalendarDays },
  { href: '/professionals', label: 'אנשי מקצוע',     icon: HardHat },
  { href: '/documents',     label: 'מסמכים והיתרים', icon: FileText },
  { href: '/photos',        label: 'תמונות ותיעוד',  icon: Camera },
  { href: '/log',           label: 'יומן עבודה',     icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 right-0 h-screen w-60 bg-white border-l border-sand-100 shadow-sm flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sand-100">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
          <Home className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm leading-tight">הבית שלי</div>
          <div className="text-xs text-gray-400">ניהול פרויקט</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-sand-50 hover:text-gray-900'
                  )}
                >
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-brand-600' : 'text-gray-400')} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 py-4 border-t border-sand-100">
        <Link
          href="/settings"
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            pathname.startsWith('/settings')
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-600 hover:bg-sand-50 hover:text-gray-900'
          )}
        >
          <Settings className={clsx('w-4 h-4 flex-shrink-0', pathname.startsWith('/settings') ? 'text-brand-600' : 'text-gray-400')} />
          הגדרות פרויקט
        </Link>
        <div className="text-xs text-gray-400 text-center mt-3">גרסה 1.0</div>
      </div>
    </aside>
  );
}
