import type { Company } from '../../lib/types';

export function AboutTab({ company }: { company: Company }) {
  return (
    <div className="flex flex-col gap-4">
      {company.description ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">{company.description}</p>
      ) : (
        <p className="text-sm text-text-secondary">Компания пока не добавила описание.</p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Город</dt>
          <dd className="text-sm text-text-primary">{company.city}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Адрес</dt>
          <dd className="text-sm text-text-primary">{company.address}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Телефон</dt>
          <dd className="text-sm text-text-primary">
            <a href={`tel:${company.phone}`} className="hover:underline">
              {company.phone}
            </a>
          </dd>
        </div>
        {company.website ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Сайт</dt>
            <dd className="text-sm text-text-primary">
              <a href={company.website} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                {company.website}
              </a>
            </dd>
          </div>
        ) : null}
        {company.workHours ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Часы работы</dt>
            <dd className="text-sm text-text-primary">{company.workHours}</dd>
          </div>
        ) : null}
      </dl>
      {company.videoUrl ? (
        <div>
          <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Видео о компании</dt>
          <a href={company.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
            {company.videoUrl}
          </a>
        </div>
      ) : null}
    </div>
  );
}

export default AboutTab;
