'use client';

import { getTelegramUrl, getTelegramUsername } from '@/lib/contact';
import { useTranslations } from 'next-intl';

type Props = {
  className?: string;
  linkClassName?: string;
};

export default function AdminTelegramContact({
  className,
  linkClassName = 'font-semibold text-sky-400 hover:underline',
}: Props) {
  const t = useTranslations();
  const username = getTelegramUsername();
  const url = getTelegramUrl();

  return (
    <span className={className}>
      {t('contactAdminTelegram')}{' '}
      <a href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        @{username}
      </a>
    </span>
  );
}
