export type PublicGovSite = {
  href: string;
  labelKey: string;
};

/** Пайвандҳои расмии мақомоти давлатӣ (монанди ahd.tj) */
export const PUBLIC_GOV_SITES: PublicGovSite[] = [
  { href: 'https://president.tj', labelKey: 'publicGovSitePresident' },
  { href: 'https://majmilli.tj', labelKey: 'publicGovSiteMajlisiMillii' },
  { href: 'https://www.gov.tj', labelKey: 'publicGovSiteGovernment' },
  { href: 'https://www.mfa.tj', labelKey: 'publicGovSiteMfa' },
  { href: 'https://khovar.tj', labelKey: 'publicGovSiteKhovar' },
  { href: 'https://www.stat.tj', labelKey: 'publicGovSiteStat' },
  { href: 'https://www.egov.tj', labelKey: 'publicGovSiteEgov' },
  { href: 'https://www.education.tj', labelKey: 'publicGovSiteEducation' },
  { href: 'https://www.mehnat.tj', labelKey: 'publicGovSiteMehnat' },
  { href: 'https://www.anticorruption.tj', labelKey: 'publicGovSiteAnticorruption' },
];
