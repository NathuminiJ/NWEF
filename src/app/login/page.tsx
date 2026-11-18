import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { dashboardForRole } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/auth/session';
import { dataProtectionNotice } from '@/lib/constants';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'Scholarship portal | Eng. Nahil Wijesuriya FIMarEST Endowment Fund',
};

function safeNext(value?: string | string[]) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith('/') || next.startsWith('//')) return undefined;
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const user = await getCurrentUser();
  if (user) redirect(next ?? dashboardForRole(user.role));

  return (
    <>
      <a className="skip-link" href="#login-form">
        Skip to sign in
      </a>
      <main className={styles.page}>
        <section className={styles.brandPanel}>
          <Link className={styles.brand} href="/" aria-label="Endowment Fund home">
            <span className={styles.brandMark}>NW</span>
            <span>Endowment Fund</span>
          </Link>
          <div className={styles.brandCopy}>
            <p className={styles.eyebrow}>The scholarship portal</p>
            <h1 className={styles.title}>Building a future shaped by opportunity.</h1>
            <p className={styles.description}>
              Apply for support, track your application, book an interview, and accept an award through one secure
              portal.
            </p>
          </div>
          <blockquote className={styles.quote}>
            A lasting legacy is measured by the opportunities we create for others.
          </blockquote>
        </section>

        <section className={styles.formPanel} id="login-form">
          <Link className={styles.backLink} href="/">
            ← Back to the fund
          </Link>
          <div className={styles.card} aria-labelledby="login-title">
            <p className={styles.cardEyebrow}>Secure access</p>
            <h2 className={styles.cardTitle} id="login-title">
              Passwordless sign in
            </h2>
            <p className={styles.cardDescription}>
              We verify your mobile number with a one-time code. New applicants can sign in with any mobile number to
              begin an application.
            </p>
            <OtpLoginForm next={next} />
          </div>
          <p className={styles.notice}>
            {dataProtectionNotice.rights} Contact {dataProtectionNotice.contact} for data protection enquiries.
          </p>
        </section>
      </main>
    </>
  );
}
