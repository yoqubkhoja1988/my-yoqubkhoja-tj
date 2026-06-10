import { OrganizationSectionContent } from '@/types/organization-section';

export type UpdateSectionResult = {
  content: OrganizationSectionContent | null;
  error?: string;
};

export async function fetchOrganizationSection(
  organizationId: string,
  slug: string
): Promise<OrganizationSectionContent | null> {
  const res = await fetch(`/api/organizations/${organizationId}/sections/${slug}`, {
    credentials: 'same-origin',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateOrganizationSectionResult(
  organizationId: string,
  slug: string,
  content: OrganizationSectionContent
): Promise<UpdateSectionResult> {
  let res: Response;
  try {
    res = await fetch(`/api/organizations/${organizationId}/sections/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
      credentials: 'same-origin',
    });
  } catch {
    return { content: null, error: 'network_error' };
  }

  if (!res.ok) {
    let error = `http_${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) error = body.error;
    } catch {
      // ignore parse errors
    }
    return { content: null, error };
  }

  return { content: await res.json() };
}

export async function updateOrganizationSection(
  organizationId: string,
  slug: string,
  content: OrganizationSectionContent
): Promise<OrganizationSectionContent | null> {
  const result = await updateOrganizationSectionResult(organizationId, slug, content);
  return result.content;
}
