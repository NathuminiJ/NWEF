import Image from 'next/image';
import Link from 'next/link';
import styles from './LandingPage.module.css';

const portraitUrl = 'https://www.eastwest.lk/images/nahil-wijesuriya.jpg';
const applyHref = '/login?next=%2Fapply';

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
              <Link className={styles.navApply} href={applyHref}>
                Apply now
                <ArrowIcon />
              </Link>
            </div>
          </nav>

          <div className={styles.heroContent}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Applications open — Stream A &amp; Stream B</p>
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
                <Link className={styles.primaryLink} href={applyHref}>
                  Apply for a scholarship
                  <ArrowIcon />
                </Link>
                <Link className={styles.secondaryLink} href="#purpose">
                  Discover the fund
                </Link>
              </div>
              <p className={styles.heroNote}>
                <span aria-hidden="true">01</span> Choose a stream <span aria-hidden="true">02</span> Complete the guided form{' '}
                <span aria-hidden="true">03</span> Track every step
              </p>
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

        <Link className={styles.mobileApplyBar} href={applyHref}>
          Apply for a scholarship
          <ArrowIcon />
        </Link>

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
            <Link className={styles.purposeLink} href={applyHref}>
              Start an application
              <ArrowIcon />
            </Link>
          </div>
          <blockquote className={styles.quote}>
            <span aria-hidden="true">“</span>
            A lasting legacy is measured by the opportunities we create for others.
          </blockquote>
        </section>

        <section className={styles.streams} id="streams">
          <div className={styles.sectionNumber} aria-hidden="true">
            02
          </div>
          <div className={styles.streamsContent}>
            <p className={styles.eyebrow}>Two scholarship streams</p>
            <h2 className={styles.sectionTitle}>One fund. Two clear pathways.</h2>
            <p className={styles.sectionDescription}>
              Choose the stream that fits the application. You can review and change every detail before you submit.
            </p>

            <div className={styles.streamList}>
              <article className={styles.streamRow}>
                <p className={styles.streamIndex} aria-hidden="true">
                  A
                </p>
                <div>
                  <h3 className={styles.streamTitle}>Old Trinitian Support</h3>
                  <p className={styles.streamText}>
                    Parent/guardian supported applications. No income, salary or employment evidence is requested.
                  </p>
                </div>
                <Link className={styles.streamLink} href={applyHref}>
                  Apply under Stream A
                  <ArrowIcon />
                </Link>
              </article>
              <article className={styles.streamRow}>
                <p className={styles.streamIndex} aria-hidden="true">
                  B
                </p>
                <div>
                  <h3 className={styles.streamTitle}>Sports Scholarship</h3>
                  <p className={styles.streamText}>
                    For athletes recruited on sporting ability, with results, level and coach details captured in the form.
                  </p>
                </div>
                <Link className={styles.streamLink} href={applyHref}>
                  Apply under Stream B
                  <ArrowIcon />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.process} id="how-it-works">
          <div className={styles.sectionNumber} aria-hidden="true">
            03
          </div>
          <div className={styles.processContent}>
            <p className={styles.eyebrow}>The application journey</p>
            <h2 className={styles.sectionTitle}>From first draft to active award.</h2>
            <p className={styles.sectionDescription}>
              Every stage is recorded, time-stamped and visible to the applicant. The portal keeps the process moving.
            </p>

            <div className={styles.processGrid}>
              {[
                ['01', 'Apply', 'Sign in with your mobile number, choose a stream and enter the child’s grade and Trinity house.'],
                ['02', 'Review', 'The screening team checks the record and requests information only when it is needed.'],
                ['03', 'Interview', 'Shortlisted applicants choose an available panel slot and the panel scores each criterion.'],
                ['04', 'Award', 'Trustees decide, finance issues the award letter, and payments are tracked against college invoices.'],
              ].map(([number, title, text]) => (
                <div className={styles.processStep} key={number}>
                  <p className={styles.processNumber}>{number}</p>
                  <h3 className={styles.processTitle}>{title}</h3>
                  <p className={styles.processText}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <Link className={`${styles.brand} ${styles.footerBrand}`} href="#home">
            <span className={styles.brandMark}>NW</span>
            <span>Endowment Fund</span>
          </Link>
          <p className={styles.footerName}>Eng. Nahil Wijesuriya FIMarEST Endowment Fund</p>
          <div className={styles.footerLinks}>
            <Link href={applyHref}>Apply now</Link>
            <Link href="/login">Portal sign in</Link>
            <Link href="#home">Back to top ↑</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
