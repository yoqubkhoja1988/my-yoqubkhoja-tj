'use client';

import { PUBLIC_GOV_SITES } from '@/lib/public-gov-sites';
import { getTelegramUrl, getTelegramUsername } from '@/lib/contact';
import { useTranslations } from 'next-intl';

function TajikFlagIcon() {
  return (
    <div className="public-footer-flag" aria-hidden>
      <span className="public-footer-flag__stripe public-footer-flag__stripe--red" />
      <span className="public-footer-flag__stripe public-footer-flag__stripe--white">
        <span className="public-footer-flag__crown">👑</span>
      </span>
      <span className="public-footer-flag__stripe public-footer-flag__stripe--green" />
    </div>
  );
}

function TajikEmblemIcon() {
  return (
    <div className="public-footer-emblem" aria-hidden>
      <span className="public-footer-emblem__ring">☀</span>
      <span className="public-footer-emblem__crown">👑</span>
      <span className="public-footer-emblem__mountains">⛰</span>
    </div>
  );
}

function NationalAnthemButton() {
  const t = useTranslations();

  return (
    <a
      href="https://www.president.tj/tj/node/3744"
      target="_blank"
      rel="noopener noreferrer"
      className="public-footer-anthem"
      aria-label={t('publicFooterAnthem')}
    >
      <span className="public-footer-anthem__disc">
        <span className="public-footer-anthem__play">▶</span>
      </span>
    </a>
  );
}

function GovSitesBanner() {
  const t = useTranslations();
  const items = PUBLIC_GOV_SITES.map((site) => (
    <a
      key={site.href}
      href={site.href}
      target="_blank"
      rel="noopener noreferrer"
      className="public-footer-site-link"
      aria-label={t(site.labelKey)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={site.logoSrc} alt={t(site.labelKey)} className="public-footer-site-link__logo" loading="lazy" />
    </a>
  ));

  return (
    <section className="public-footer-sites" aria-label={t('publicFooterSitesTitle')}>
      <h2 className="public-footer-sites__title">{t('publicFooterSitesTitle')}</h2>
      <div className="public-footer-sites__viewport">
        <div className="public-footer-sites__track">
          {items}
          {items}
        </div>
      </div>
    </section>
  );
}

export default function PublicPortalFooter() {
  const t = useTranslations();
  const telegramUrl = getTelegramUrl();
  const telegramUsername = getTelegramUsername();
  const year = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <section className="public-footer-symbols" aria-label={t('publicFooterSymbolsLabel')}>
        <article className="public-footer-symbol-card">
          <h3 className="public-footer-symbol-card__title">{t('publicFooterFlag')}</h3>
          <TajikFlagIcon />
        </article>
        <article className="public-footer-symbol-card">
          <h3 className="public-footer-symbol-card__title">{t('publicFooterEmblem')}</h3>
          <TajikEmblemIcon />
        </article>
        <article className="public-footer-symbol-card">
          <h3 className="public-footer-symbol-card__title">{t('publicFooterAnthem')}</h3>
          <NationalAnthemButton />
        </article>
      </section>

      <GovSitesBanner />

      <section className="public-footer-info">
        <div className="public-footer-info__grid">
          <div className="public-footer-info__col">
            <p>{t('publicFooterCopyright', { year })}</p>
          </div>
          <div className="public-footer-info__col">
            <p>{t('publicFooterRights')}</p>
          </div>
          <div className="public-footer-info__col">
            <p>{t('publicFooterAddress')}</p>
            <p className="mt-1">{t('publicFooterPhone')}</p>
            <p className="mt-1">
              {t('publicFooterEmail')}:{' '}
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="public-footer-info__link">
                @{telegramUsername}
              </a>
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
