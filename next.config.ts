import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**': ['./data/**/*'],
    '/[locale]/organizations/**': ['./data/**/*'],
  },
};

export default withNextIntl(nextConfig);
