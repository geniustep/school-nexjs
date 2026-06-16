'use client';

export function FeeTypeDetailSkeleton() {
  return (
    <div className="fee-type-detail-page fee-type-detail-page--loading" aria-busy="true">
      <div className="finance-skeleton finance-skeleton--label" />
      <div className="finance-skeleton fee-type-detail-page__skeleton-title" />
      <div className="finance-skeleton fee-type-detail-page__skeleton-subtitle" />
      <div className="fee-type-detail-page__skeleton-grid">
        <div className="finance-skeleton fee-type-detail-page__skeleton-card" />
        <div className="finance-skeleton fee-type-detail-page__skeleton-card" />
      </div>
    </div>
  );
}

export function FeeTypesListSkeleton() {
  return (
    <div className="fee-types-list-skeleton" aria-busy="true">
      <div className="finance-skeleton fee-types-list-skeleton__row" />
      <div className="finance-skeleton fee-types-list-skeleton__row" />
      <div className="finance-skeleton fee-types-list-skeleton__row" />
      <div className="finance-skeleton fee-types-list-skeleton__row" />
    </div>
  );
}
