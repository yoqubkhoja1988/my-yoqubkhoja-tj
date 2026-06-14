'use client';

import Image from 'next/image';

export const ORGANIZATION_LOGO_SRC = '/images/organization-eagle-logo.png';

type Props = {
  variant?: 'document' | 'header';
  className?: string;
  size?: number;
};

function logoDimensions(variant: 'document' | 'header', size?: number) {
  const height = size ?? (variant === 'header' ? 40 : 96);
  const width = Math.round(height * 1.35);
  return { width, height };
}

export default function OrganizationOfficialLogo({
  variant = 'document',
  className = '',
  size,
}: Props) {
  const { width, height } = logoDimensions(variant, size);

  if (variant === 'header') {
    return (
      <div className={`org-logo-animated shrink-0 ${className}`} aria-hidden>
        <Image
          src={ORGANIZATION_LOGO_SRC}
          alt=""
          width={width}
          height={height}
          className="org-logo-image h-auto w-auto object-contain"
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
        width={width}
        height={height}
        className="org-logo-image h-auto w-auto object-contain"
      />
    </div>
  );
}
