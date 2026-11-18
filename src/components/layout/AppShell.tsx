'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@prisma/client';
import { ROLE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui';
import styles from './AppShell.module.css';

interface NavItem {
  href: string;
  label: string;
}

function navFor(role: Role): NavItem[] {
  switch (role) {
    case 'APPLICANT':
      return [
        { href: '/applications', label: 'My applications' },
        { href: '/apply', label: 'New application' },
      ];
    case 'ADMIN_OFFICER':
      return [
        { href: '/admin', label: 'Overview' },
        { href: '/screening', label: 'Screening queue' },
      ];
    case 'SCREENING_REVIEWER':
      return [{ href: '/screening', label: 'Screening queue' }];
    case 'INTERVIEW_PANEL':
      return [{ href: '/panel', label: 'Interview panel' }];
    case 'TRUSTEE':
      return [{ href: '/trustee', label: 'Trust board' }];
    case 'FINANCE_OFFICER':
      return [{ href: '/finance', label: 'Finance' }];
    case 'SUPER_ADMIN':
      return [
        { href: '/super-admin', label: 'Administration' },
        { href: '/admin', label: 'Overview' },
        { href: '/screening', label: 'Screening' },
        { href: '/trustee', label: 'Trustee' },
        { href: '/finance', label: 'Finance' },
      ];
  }
}

export function AppShell({
  user,
  children,
}: {
  user: { fullName: string; role: Role };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const items = navFor(user.role);
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#portal-main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <Link href="/" className={styles.brand} aria-label="Endowment Fund home">
              <span className={styles.brandMark}>NW</span>
              <span>Endowment Fund</span>
            </Link>
            <nav className={styles.nav} aria-label="Portal navigation">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className={styles.actions}>
            <div className={styles.userText}>
              <p className={styles.name}>{user.fullName}</p>
              <p className={styles.role}>{ROLE_LABELS[user.role]}</p>
            </div>
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main id="portal-main" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Eng. Nahil Wijesuriya FIMarEST Endowment Fund · Personal data handled under the Sri
        Lanka PDPA
      </footer>
    </div>
  );
}
