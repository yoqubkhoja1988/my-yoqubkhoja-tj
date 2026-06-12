'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function InnovationCenterBuilding() {
  const t = useTranslations();

  return (
    <section className="innovation-center" aria-label={t('innovationCenterTitle')}>
      <div className="innovation-center__photo-stage">
        <Image
          src="/images/innovation-center.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 72rem"
          className="innovation-center__photo"
        />
      </div>

      <div className="innovation-center__overlay" />

      <div className="innovation-center__sign">
        <div className="innovation-center__sign-glow" />
        <p className="innovation-center__sign-text">{t('innovationCenterTitle')}</p>
      </div>

      <div className="innovation-center__shimmer" />
    </section>
  );
}
