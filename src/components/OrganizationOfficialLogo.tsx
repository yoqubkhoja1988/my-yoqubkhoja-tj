'use client';

import Image from 'next/image';

export const ORGANIZATION_LOGO_SRC = '/images/organization-eagle-logo.png';

type Props = {
  variant?: 'document' | 'header';
  className?: string;
  size?: number;
};

export default function OrganizationOfficialLogo({
  variant = 'document',
  className = '',
  size,
}: Props) {
  const dimension = size ?? (variant === 'header' ? 44 : 88);

  if (variant === 'header') {
    return (
      <div className={`org-logo-animated shrink-0 ${className}`} aria-hidden>
        <Image
          src={ORGANIZATION_LOGO_SRC}
          alt=""
          width={dimension}
          height={dimension}
          className="org-logo-image rounded-full object-cover"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`org-logo-document mb-4 flex justify-center print:mb-3 ${className}`}>
      <Image
        src={ORGANIZATION_LOGO_SRC}
        alt=""
        width={dimension}
        height={dimension}
        className="org-logo-image rounded-full object-cover"
      />
    </div>
  );
}
