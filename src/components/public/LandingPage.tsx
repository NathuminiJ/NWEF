import Image from 'next/image';
import Link from 'next/link';
import styles from './LandingPage.module.css';

const portraitUrl = 'https://www.eastwest.lk/images/nahil-wijesuriya.jpg';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <main id="main">
        <section className={styles.hero} id="home">
          <nav className={styles.nav} aria-label="Main navigation">
            <Link className={styles.brand} href="#home" aria-label="Endowment Fund home">
              <span className={styles.brandMark}>NW</span>
              <span>Endowment Fund</span>
            </Link>
            <div className={styles.navActions}>
              <Link className={styles.navLink} href="#purpose">
                Our purpose
              </Link>
              <Link className={styles.portalLink} href="/login">
                Scholarship portal
              </Link>
            </div>
          </nav>

          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>A legacy of vision and service</p>
              <h1 className={styles.heroTitle}>
                Eng. Nahil
                <br />
                Wijesuriya <span className={styles.heroTitleAccent}>FIMarEST</span>
              </h1>
              <p className={styles.heroDescription}>
                Honouring a distinguished legacy by creating opportunities, advancing knowledge, and investing in the
                promise of future generations.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.primaryLink} href="#purpose">
                  Discover the fund
                  <ArrowIcon />
                </Link>
                <Link className={styles.secondaryLink} href="/login?next=%2Fapply">
                  Apply for a scholarship
                </Link>
              </div>
            </div>

            <div className={styles.portraitWrap}>
              <div className={styles.portraitFrame}>
                <Image
                  src={portraitUrl}
                  alt="Eng. Nahil Wijesuriya FIMarEST"
                  className={styles.portrait}
                  fill
                  sizes="(max-width: 800px) 90vw, 28rem"
                  priority
                />
              </div>
              <div className={styles.portraitCaption}>
                <span>Engineer</span>
                <span aria-hidden="true">•</span>
                <span>Visionary</span>
                <span aria-hidden="true">•</span>
                <span>Philanthropist</span>
              </div>
            </div>
          </div>

          <Link className={styles.scrollCue} href="#purpose" aria-label="Scroll to our purpose">
            <span />
            Scroll to explore
          </Link>
        </section>

        <section className={styles.purpose} id="purpose">
          <div className={styles.sectionNumber} aria-hidden="true">
            01
          </div>
          <div className={styles.purposeContent}>
            <p className={styles.eyebrow}>The Endowment Fund</p>
            <h2 className={styles.purposeTitle}>Building a future shaped by opportunity.</h2>
            <p className={styles.purposeDescription}>
              The Eng. Nahil Wijesuriya FIMarEST Endowment Fund carries forward an enduring commitment to education,
              innovation, and meaningful progress. It exists to help ideas and people reach their fullest potential.
            </p>
            <Link className={styles.purposeLink} href="/login?next=%2Fapply">
              Start an application
              <ArrowIcon />
            </Link>
          </div>
          <blockquote className={styles.quote}>
            <span aria-hidden="true">“</span>
            A lasting legacy is measured by the opportunities we create for others.
          </blockquote>
        </section>

        <footer className={styles.footer}>
          <Link className={`${styles.brand} ${styles.footerBrand}`} href="#home">
            <span className={styles.brandMark}>NW</span>
            <span>Endowment Fund</span>
          </Link>
          <p className={styles.footerName}>Eng. Nahil Wijesuriya FIMarEST Endowment Fund</p>
          <div className={styles.footerLinks}>
            <Link href="/login">Portal sign in</Link>
            <Link href="#home">Back to top ↑</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
