'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@eduotaga/ui/web';
import { 
  Home, 
  FlaskConical, 
  BookOpen, 
  MonitorPlay, 
  Video, 
  LayoutDashboard, 
  FileText, 
  Bookmark, 
  Trophy, 
  HelpCircle
} from 'lucide-react';
import Image from 'next/image';

const MAIN_NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/experiments', label: 'Experiments', icon: FlaskConical },
  // { href: '/simulations', label: 'Simulations', icon: MonitorPlay },
  { href: '/videos', label: 'Videos', icon: Video },
  { href: '/my-lab', label: 'My Lab', icon: LayoutDashboard },
  // { href: '/reports', label: 'Reports', icon: FileText },
  // { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  // { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r-2 border-black dark:border-white bg-background transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b-2 border-black dark:border-white px-5">
          <img src="/logo-light.png" alt="edUOtaga Logo" width="150" height="48" className="block dark:hidden h-12 w-auto object-contain" />
          <img src="/logo-dark.png" alt="edUOtaga Logo" width="150" height="48" className="hidden dark:block h-12 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="text-xl font-black uppercase leading-tight tracking-tight text-foreground">edUOtaga</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Virtual Labs</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 font-semibold">
          <ul className="flex flex-col gap-2">
            {MAIN_NAV_ITEMS.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-4 rounded-xl px-4 py-3 text-sm transition-all',
                      isActive
                        ? 'bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                        : 'text-foreground hover:bg-black/5 dark:hover:bg-white/5',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          
          <div className="mt-8 border-t-2 border-dashed border-black dark:border-white pt-6">
            <Link
              href="/help"
              onClick={onClose}
              className="flex items-center gap-4 rounded-xl px-4 py-3 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            >
              <HelpCircle className="h-5 w-5" />
              Help & Support
            </Link>
          </div>
        </nav>

        <div className="p-4">
          <div className="neo-card-no-hover bg-neo-purple dark:bg-neo-purple dark:text-black p-4 text-center">
            <h3 className="font-bold text-sm">Open Source</h3>
            <p className="mt-1 text-[11px] font-medium">
              Free forever. Built for everyone.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
