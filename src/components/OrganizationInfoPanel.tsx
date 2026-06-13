'use client';

import UserContentText from '@/components/UserContentText';
import {
  ORG_REPORT_LOCALES,
  normalizeReportOrganizationNames,
  reportHeaderWithOrganizationNames,
  resolveOrganizationReportName,
} from '@/lib/organization-info';
import {
  OrganizationReportHeader,
  OrganizationReportLocale,
  OrganizationReportNames,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';

type Props = {
  organizationName: string;
  reportHeader?: OrganizationReportHeader;
  editing?: boolean;
  onChange?: (reportHeader: OrganizationReportHeader) => void;
};

const LOCALE_LABEL_KEYS: Record<OrganizationReportLocale, string> = {
  tj: 'orgInfoLangTj',
  ru: 'orgInfoLangRu',
  en: 'orgInfoLangEn',
  uz: 'orgInfoLangUz',
};

function displayAuthorities(lines: string[] | undefined): string[] {
  return (lines ?? []).map((line) => line.trim()).filter(Boolean);
}

function editingAuthorities(lines: string[] | undefined): string[] {
  if (!lines?.length) return [''];
  return lines;
}

export default function OrganizationInfoPanel({
  organizationName,
  reportHeader,
  editing = false,
  onChange,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const displayName = resolveOrganizationReportName(reportHeader, organizationName, locale);
  const nameFields = normalizeReportOrganizationNames(reportHeader);
  const authorities = editing
    ? editingAuthorities(reportHeader?.superiorAuthorities)
    : displayAuthorities(reportHeader?.superiorAuthorities);

  function patch(next: OrganizationReportHeader) {
    onChange?.(next);
  }

  function updateNameField(code: OrganizationReportLocale, value: string) {
    const nextNames: OrganizationReportNames = { ...nameFields, [code]: value };
    patch(reportHeaderWithOrganizationNames(reportHeader, nextNames));
  }

  function updateAuthority(index: number, value: string) {
    const next = [...authorities];
    next[index] = value;
    patch({
      ...reportHeader,
      superiorAuthorities: next,
    });
  }

  function addAuthority() {
    patch({
      ...reportHeader,
      superiorAuthorities: [...authorities, ''],
    });
  }

  function removeAuthority(index: number) {
    const next = authorities.filter((_, i) => i !== index);
    patch({
      ...reportHeader,
      superiorAuthorities: next.length > 0 ? next : [''],
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('orgInfoIntro')}</p>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {t('orgInfoPreviewLabel')}
        </p>
        <div className="mt-3 space-y-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
            {t('vacancyNoticeRepublic')}
          </p>
          {(editing ? authorities.filter((line) => line.trim()) : authorities).map((line, index) => (
            <p key={`${line}-${index}`} className="text-xs text-[var(--text-muted)]">
              {line ? (
                <UserContentText text={line} as="span" />
              ) : (
                t('orgInfoAuthorityPlaceholder')
              )}
            </p>
          ))}
          <p className="mt-2 text-sm font-bold">{displayName}</p>
        </div>
      </div>

      {editing && onChange ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="field-label">{t('orgInfoFieldOrganizationName')}</label>
            {ORG_REPORT_LOCALES.map((code) => (
              <div key={code}>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {t(LOCALE_LABEL_KEYS[code])}
                </label>
                <input
                  type="text"
                  value={nameFields[code] ?? ''}
                  onChange={(e) => updateNameField(code, e.target.value)}
                  className="input-field text-sm"
                  placeholder={code === 'tj' ? organizationName : ''}
                />
              </div>
            ))}
            <p className="text-[10px] text-[var(--text-muted)]">
              {t('orgInfoFieldOrganizationNamesHint')}
            </p>
          </div>

          <div className="space-y-2">
            <label className="field-label">{t('orgInfoFieldSuperiorAuthorities')}</label>
            {authorities.map((line, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={line}
                  onChange={(e) => updateAuthority(index, e.target.value)}
                  className="input-field flex-1 text-sm"
                  placeholder={t('orgInfoAuthorityPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => removeAuthority(index)}
                  className="btn-secondary shrink-0 px-3 text-xs"
                  disabled={authorities.length <= 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={addAuthority} className="btn-secondary text-xs">
              + {t('orgInfoAddAuthority')}
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          {ORG_REPORT_LOCALES.map((code) => {
            const value = nameFields[code]?.trim();
            if (!value) return null;
            return (
              <div key={code} className={code === 'tj' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {t('orgInfoFieldOrganizationName')} ({t(LOCALE_LABEL_KEYS[code])})
                </dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            );
          })}
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('orgInfoFieldSuperiorAuthorities')}
            </dt>
            <dd className="mt-1 space-y-1 text-sm">
              {authorities.map((line, index) => (
                <p key={`${line}-${index}`}>
                  <UserContentText text={line} as="span" />
                </p>
              ))}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
