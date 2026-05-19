'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

const adminTabs = [
  { href: '/admin/news/create', label: '뉴스 작성' },
  { href: '/admin/news', label: '뉴스 관리' },
  { href: '/admin/users', label: '사용자 관리' },
  { href: '/admin/reporters', label: '기자 관리' },
  { href: '/admin/stats', label: '통계 분석' },
  { href: '/admin/subscribers', label: '구독자 관리' },
];

const reporterTabs = [
  { href: '/reporter/dashboard', label: '기자센터' },
  { href: '/admin/news/create', label: '기사 작성' },
  { href: '/admin/news', label: '내 기사' },
  { href: '/reporter/feed', label: '피드' },
  { href: '/reporter/subscribers', label: '구독자' },
  { href: '/reporter/profile/edit', label: '프로필' },
];

export default function AdminNavTabs() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    api.get('/users/me')
      .then((res) => setRole(res.data?.role || null))
      .catch(() => setRole(null));
  }, []);

  const tabs = role === 'reporter' ? reporterTabs : role === 'admin' ? adminTabs : [];

  return (
    <nav className="mx-auto max-w-5xl overflow-x-auto px-4 pb-3">
      <div className="flex min-w-max items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href === '/admin/news' && pathname.startsWith('/admin/news/') && pathname !== '/admin/news/create') ||
            (tab.href === '/reporter/dashboard' && pathname.startsWith('/reporter/dashboard')) ||
            (tab.href === '/reporter/feed' && pathname.startsWith('/reporter/feed')) ||
            (tab.href === '/reporter/subscribers' && pathname.startsWith('/reporter/subscribers')) ||
            (tab.href === '/reporter/profile/edit' && pathname.startsWith('/reporter/profile/edit')) ||
            (tab.href === '/admin/reporters' && pathname.startsWith('/admin/reporter-requests'));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium leading-none transition ${
                active
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
