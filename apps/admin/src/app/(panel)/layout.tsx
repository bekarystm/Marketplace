'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { formatPhone } from '@marketplace/shared';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

const ADMIN_NAV = [
  { href: '/', label: 'Обзор' },
  { href: '/orders', label: 'Заказы' },
  { href: '/stores', label: 'Магазины' },
  { href: '/couriers', label: 'Курьеры' },
  { href: '/categories', label: 'Категории' },
  { href: '/promo', label: 'Промокоды' },
  { href: '/support', label: 'Поддержка' },
  { href: '/users', label: 'Пользователи' },
  { href: '/settings', label: 'Настройки' },
];
const MANAGER_NAV = [
  { href: '/', label: 'Обзор' },
  { href: '/orders', label: 'Заказы' },
  { href: '/stores', label: 'Мой магазин' },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { loading, session, profile, isAdmin, managedStores } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  if (loading || !session) return <div className="p-10 text-stone-400">Загрузка…</div>;

  if (!isAdmin && managedStores.length === 0) {
    return (
      <div className="mx-auto max-w-md p-10 text-center space-y-4">
        <p>У аккаунта {formatPhone(profile?.phone)} нет доступа к админке.</p>
        <p className="text-sm text-stone-500">Доступ есть у администраторов и менеджеров магазинов.</p>
        <button className="text-green-700 underline" onClick={() => supabase.auth.signOut({ scope: 'local' })}>Выйти</button>
      </div>
    );
  }

  const nav = isAdmin ? ADMIN_NAV : MANAGER_NAV;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200 bg-white p-4 md:flex">
        <div className="mb-6 px-2 text-xl font-black tracking-wide"><span className="text-accent">TDK</span><span className="text-green-700">FOOD</span></div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => {
            const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-green-50 font-semibold text-green-800' : 'text-stone-600 hover:bg-stone-50'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 pt-3 text-xs text-stone-500">
          <div className="font-medium text-stone-800">{profile?.full_name ?? '—'}</div>
          <div>{formatPhone(profile?.phone)}</div>
          <button className="mt-2 text-green-700 hover:underline" onClick={() => supabase.auth.signOut({ scope: 'local' })}>Выйти</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="flex gap-3 overflow-x-auto border-b border-stone-200 bg-white px-4 py-3 text-sm md:hidden">
          {nav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap text-stone-700">{n.label}</Link>)}
        </nav>
        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
