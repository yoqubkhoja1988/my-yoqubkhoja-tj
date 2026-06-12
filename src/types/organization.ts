export type OrganizationSectorId =
  | 'state-governance'
  | 'ministries-agencies'
  | 'local-government'
  | 'education'
  | 'healthcare'
  | 'social-protection'
  | 'agriculture-food'
  | 'industry-energy'
  | 'finance-economy'
  | 'transport-communications'
  | 'justice-security'
  | 'culture-sports'
  | 'science-innovation';

export interface Organization {

  id: string;

  /** Соҳаи гуруҳбандӣ мувофиқи сохтори иқтисодии ҶТ */
  sector?: OrganizationSectorId;

  rma?: string;

  ryam?: string;

  name: string;

  address?: string;

  director?: string;

  chiefAccountant?: string;

  directorPhone?: string;

  chiefAccountantPhone?: string;

  phone?: string;

  taxDistrict?: string;

  status?: string;

  registeredAt?: string;

  description: string;

  createdAt: string;

}

