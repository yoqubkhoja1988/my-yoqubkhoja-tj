'use client';

import { OrganizationReportHeader } from '@/types/organization-section';
import { useTranslations } from 'next-intl';

type Props = {
  organizationName: string;
  reportHeader?: OrganizationReportHeader;
  editing?: boolean;
  onChange?: (reportHeader: OrganizationReportHeader) => void;
};

function normalizeAuthorities(lines: string[] | undefined): string[] {
  const values = (lines ?? []).map((line) => line.trim()).filter(Boolean);
  return values.length > 0 ? values : [''];
}

export default function OrganizationInfoPanel({
  organizationName,
  reportHeader,
  editing = false,
  onChange,
}: Props) {
  const t = useTranslations();
  const displayName = reportHeader?.reportOrganizationName?.trim() || organizationName;
  const authorities = normalizeAuthorities(reportHeader?.superiorAuthorities);

  function patch(next: OrganizationReportHeader) {
    onChange?.(next);
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
          {(editing ? authorities : authorities.filter(Boolean)).map((line, index) => (
            <p key={`${line}-${index}`} className="text-xs text-[var(--text-muted)]">
              {line || t('orgInfoAuthorityPlaceholder')}
            </p>
          ))}
          <p className="mt-2 text-sm font-bold">{displayName}</p>
        </div>
      </div>

      {editing && onChange ? (
        <div className="space-y-4">
          <div>
            <label className="field-label">{t('orgInfoFieldOrganizationName')}</label>
            <input
              type="text"
              value={reportHeader?.reportOrganizationName ?? ''}
              onChange={(e) =>
                patch({
                  ...reportHeader,
                  reportOrganizationName: e.target.value,
                })
              }
              className="input-field text-sm"
              placeholder={organizationName}
            />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              {t('orgInfoFieldOrganizationNameHint')}
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
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('orgInfoFieldOrganizationName')}
            </dt>
            <dd className="mt-1 text-sm font-medium">{displayName}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {t('orgInfoFieldSuperiorAuthorities')}
            </dt>
            <dd className="mt-1 space-y-1 text-sm">
              {authorities.filter(Boolean).map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
