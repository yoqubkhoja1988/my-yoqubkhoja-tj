'use client';

import InnovationCenterBuilding from '@/components/InnovationCenterBuilding';
import AdminTelegramContact from '@/components/AdminTelegramContact';
import { Link } from '@/i18n/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

const NEWS_KEYS = ['publicNews1', 'publicNews2', 'publicNews3'] as const;
const SERVICE_KEYS = ['publicService1', 'publicService2', 'publicService3'] as const;

export default function PublicHomePage() {
  const t = useTranslations();
  const { data: session } = useSession();

  return (
    <main className="public-portal-main animate-in">
      <div className="public-portal-grid">
        <div className="public-portal-content space-y-5">
          <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
            <InnovationCenterBuilding />
          </section>

          <section id="activity" className="gov-content-panel scroll-mt-36">
            <h2 className="public-section-title">{t('publicActivityTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t('publicActivityText')}
            </p>
            <ul className="mt-4 space-y-2">
              {NEWS_KEYS.map((key) => (
                <li
                  key={key}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                >
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>

          <section id="about" className="gov-content-panel scroll-mt-36">
            <h2 className="public-section-title">{t('publicAboutTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t('publicAboutText')}
            </p>
          </section>

          <section id="services" className="gov-content-panel scroll-mt-36">
            <h2 className="public-section-title">{t('publicServicesTitle')}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SERVICE_KEYS.map((key) => (
                <div key={key} className="gov-room-card !p-3 text-sm">
                  {t(key)}
                </div>
              ))}
            </div>
          </section>

          <section id="documents" className="gov-content-panel scroll-mt-36">
            <h2 className="public-section-title">{t('publicDocumentsTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t('publicDocumentsText')}
            </p>
          </section>

          <section id="contact" className="gov-content-panel scroll-mt-36">
            <h2 className="public-section-title">{t('publicNavContact')}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              <AdminTelegramContact linkClassName="font-semibold text-[var(--accent)] hover:underline" />
            </p>
          </section>
        </div>

        <aside className="public-portal-sidebar space-y-4">
          <section className="public-cabinet-card">
            <div className="public-cabinet-card__icon" aria-hidden>
              🔐
            </div>
            <h2 className="text-sm font-extrabold uppercase leading-snug tracking-wide">
              {t('publicCabinetTitle')}
            </h2>
            <p className="mt-2 text-xs leading-relaxed opacity-90">{t('publicCabinetDesc')}</p>
            {session ? (
              <Link href="/room" className="public-cabinet-card__btn mt-4">
                {t('publicCabinetEnter')}
              </Link>
            ) : (
              <>
                <Link href="/login" className="public-cabinet-card__btn mt-4">
                  {t('publicCabinetLogin')}
                </Link>
                <p className="mt-3 text-center text-[10px] opacity-80">
                  {t('registerNoAccount')}{' '}
                  <Link href="/register" className="font-bold underline">
                    {t('registerTitle')}
                  </Link>
                </p>
              </>
            )}
          </section>

          <section className="gov-content-panel">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {t('publicSidebarAnnouncements')}
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[var(--text-muted)]">
              <li>{t('publicAnnounce1')}</li>
              <li>{t('publicAnnounce2')}</li>
            </ul>
          </section>

          <section className="gov-content-panel">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {t('publicSidebarLinks')}
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/#services" className="text-[var(--accent)] hover:underline">
                  {t('publicNavServices')}
                </Link>
              </li>
              <li>
                <Link href="/#documents" className="text-[var(--accent)] hover:underline">
                  {t('publicNavDocuments')}
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
