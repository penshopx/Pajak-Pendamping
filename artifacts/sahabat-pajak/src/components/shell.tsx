import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutGrid, MessagesSquare, CalendarClock, Receipt, Library, Settings2, HardDrive } from 'lucide-react';
import { useStore } from '@/lib/store';

const NAV = [
  { href: '/', label: 'Ringkasan', icon: LayoutGrid },
  { href: '/kewajiban', label: 'Kewajiban', icon: CalendarClock },
  { href: '/pembayaran', label: 'Pembayaran', icon: Receipt },
  { href: '/konsultasi', label: 'Konsultasi', icon: MessagesSquare },
  { href: '/pustaka', label: 'Pustaka', icon: Library },
  { href: '/pengaturan', label: 'Pengaturan', icon: Settings2 },
];

export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="hsl(214 100% 62%)" />
      <path d="M9 17.5l4.5 4.5L23 10.5" stroke="hsl(226 50% 5%)" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { profile, hasDemo } = useStore();
  const active = (h: string) => (h === '/' ? loc === '/' : loc.startsWith(h));
  return (
    <div className="relative z-10 min-h-[100dvh] md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden md:flex sticky top-0 h-[100dvh] flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur px-4 py-6">
        <Link href="/" className="flex items-center gap-3 px-2 mb-8" data-testid="link-home">
          <Mark className="h-9 w-9" />
          <div>
            <div className="font-display text-lg font-bold leading-none">Sahabat Pajak</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">Pendamping UMKM</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`nav-${label.toLowerCase()}`}
              aria-current={active(href) ? 'page' : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors ${active(href) ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent/60'}`}>
              <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary transition-transform duration-300 origin-center ${active(href) ? 'scale-y-100' : 'scale-y-0'}`} />
              <Icon className={`h-[18px] w-[18px] transition-transform group-hover:scale-110 ${active(href) ? 'text-primary' : ''}`} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-border bg-card/70 p-3.5 text-xs leading-relaxed text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-semibold mb-1.5"><HardDrive className="h-3.5 w-3.5 text-accent" /> Tersimpan di peramban ini</div>
          Data tidak disinkronkan ke server atau perangkat lain.
          {profile.businessName && <div className="mt-2 text-foreground truncate" data-testid="text-sidebar-business">{profile.businessName}</div>}
          {hasDemo && <div className="mt-2 inline-block rounded bg-[hsl(var(--warn)/.15)] px-1.5 py-0.5 text-[hsl(var(--warn))] font-semibold">Data contoh aktif</div>}
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-30 flex items-center gap-2.5 border-b border-border bg-background/85 backdrop-blur px-4 py-3">
        <Mark className="h-7 w-7" />
        <span className="font-display font-bold">Sahabat Pajak</span>
        {hasDemo && <span className="ml-auto rounded bg-[hsl(var(--warn)/.15)] px-1.5 py-0.5 text-[11px] text-[hsl(var(--warn))] font-semibold">Data contoh</span>}
      </header>

      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 md:pb-12 md:pt-10 lg:px-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <nav aria-label="Navigasi utama" className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-6 border-t border-border bg-sidebar/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} data-testid={`mnav-${label.toLowerCase()}`}
            className={`press flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active(href) ? 'text-primary' : 'text-muted-foreground'}`}>
            <Icon className="h-5 w-5" />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, desc, actions }: { eyebrow: string; title: string; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">{eyebrow}</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{title}</h1>
        {desc && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc, action }: { icon: typeof LayoutGrid; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="rise relative overflow-hidden rounded-2xl border border-dashed border-input bg-card/50 px-6 py-14 text-center">
      <div className="grid-lines absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      <div className="relative">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-primary/40 bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{desc}</p>
        {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = 'info', children, icon: Icon }: { tone?: 'info' | 'warn'; children: ReactNode; icon: typeof LayoutGrid }) {
  const c = tone === 'warn' ? 'border-[hsl(var(--warn)/.4)] bg-[hsl(var(--warn)/.08)] [&_svg]:text-[hsl(var(--warn))]' : 'border-primary/35 bg-primary/[.07] [&_svg]:text-primary';
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed text-foreground/90 ${c}`} role="note">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" /><div>{children}</div>
    </div>
  );
}
