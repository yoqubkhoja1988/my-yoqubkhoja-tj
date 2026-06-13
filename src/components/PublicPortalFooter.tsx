'use client';

import { useRef, useState } from 'react';
import { PUBLIC_GOV_SITES } from '@/lib/public-gov-sites';
import { getTelegramUrl, getTelegramUsername } from '@/lib/contact';
import { useTranslations } from 'next-intl';

const NATIONAL_SYMBOLS = {
  flag: {
    src: '/images/national-symbols/flag.jpg',
    href: 'https://www.president.tj/tj/about-tajikistan/state-symbols/state-flag',
  },
  emblem: {
    src: '/images/national-symbols/emblem.png',
    href: 'https://www.president.tj/tj/about-tajikistan/state-symbols/state-emblem',
  },
  anthem: {
    src: '/images/national-symbols/anthem.mp3',
    href: 'https://www.president.tj/tj/node/3744',
  },
} as const;

function NationalAnthemPlayer() {
  const t = useTranslations();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlayback() {
    const player = audioRef.current;
    if (!player) return;

    if (player.paused) {
      void player.play();
      setPlaying(true);
      return;
    }

    player.pause();
    player.currentTime = 0;
    setPlaying(false);
  }

  return (
    <div className="public-footer-anthem">
      <audio
        ref={audioRef}
        src={NATIONAL_SYMBOLS.anthem.src}
        preload="none"
        onEnded={() => setPlaying(false)}
        className="public-footer-anthem__audio"
      />
      <button
        type="button"
        className="public-footer-anthem__btn"
        aria-label={t('publicFooterAnthem')}
        onClick={togglePlayback}
      >
        {playing ? '⏹' : '▶'}
      </button>
    </div>
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
          <h3 className="public-footer-symbol-card__title">
            <a href={NATIONAL_SYMBOLS.flag.href} target="_blank" rel="noopener noreferrer">
              {t('publicFooterFlag')}
            </a>
          </h3>
          <a
            href={NATIONAL_SYMBOLS.flag.href}
            target="_blank"
            rel="noopener noreferrer"
            className="public-footer-symbol-card__media"
            aria-label={t('publicFooterFlag')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NATIONAL_SYMBOLS.flag.src} alt={t('publicFooterFlag')} className="public-footer-symbol-card__flag" />
          </a>
        </article>

        <article className="public-footer-symbol-card">
          <h3 className="public-footer-symbol-card__title">
            <a href={NATIONAL_SYMBOLS.emblem.href} target="_blank" rel="noopener noreferrer">
              {t('publicFooterEmblem')}
            </a>
          </h3>
          <a
            href={NATIONAL_SYMBOLS.emblem.href}
            target="_blank"
            rel="noopener noreferrer"
            className="public-footer-symbol-card__media public-footer-symbol-card__emblem-wrap"
            aria-label={t('publicFooterEmblem')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NATIONAL_SYMBOLS.emblem.src} alt={t('publicFooterEmblem')} className="public-footer-symbol-card__emblem" />
          </a>
        </article>

        <article className="public-footer-symbol-card">
          <h3 className="public-footer-symbol-card__title">
            <a href={NATIONAL_SYMBOLS.anthem.href} target="_blank" rel="noopener noreferrer">
              {t('publicFooterAnthem')}
            </a>
          </h3>
          <NationalAnthemPlayer />
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
