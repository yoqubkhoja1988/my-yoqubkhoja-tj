export type PublicGovSite = {
  href: string;
  labelKey: string;
  logoSrc: string;
};

/** Пайвандҳои расмии мақомоти давлатӣ (монанди ahd.tj) */
export const PUBLIC_GOV_SITES: PublicGovSite[] = [
  {
    href: 'https://president.tj',
    labelKey: 'publicGovSitePresident',
    logoSrc: '/images/gov-sites/president.jpg',
  },
  {
    href: 'https://majmilli.tj',
    labelKey: 'publicGovSiteMajlisiMillii',
    logoSrc: '/images/gov-sites/majmilli.jpg',
  },
  {
    href: 'https://www.gov.tj',
    labelKey: 'publicGovSiteGovernment',
    logoSrc: '/images/gov-sites/government.jpg',
  },
  {
    href: 'https://www.mfa.tj',
    labelKey: 'publicGovSiteMfa',
    logoSrc: '/images/gov-sites/mfa.jpg',
  },
  {
    href: 'https://khovar.tj',
    labelKey: 'publicGovSiteKhovar',
    logoSrc: '/images/gov-sites/khovar.jpg',
  },
  {
    href: 'https://www.stat.tj',
    labelKey: 'publicGovSiteStat',
    logoSrc: '/images/gov-sites/stat.jpg',
  },
  {
    href: 'https://www.egov.tj',
    labelKey: 'publicGovSiteEgov',
    logoSrc: '/images/gov-sites/egov.jpg',
  },
  {
    href: 'https://www.education.tj',
    labelKey: 'publicGovSiteEducation',
    logoSrc: '/images/gov-sites/education.jpg',
  },
  {
    href: 'https://www.mehnat.tj',
    labelKey: 'publicGovSiteMehnat',
    logoSrc: '/images/gov-sites/mehnat.jpg',
  },
  {
    href: 'https://www.anticorruption.tj',
    labelKey: 'publicGovSiteAnticorruption',
    logoSrc: '/images/gov-sites/anticorruption.jpg',
  },
];
