'use client';

export function ChequeDetailsSkeleton() {
  return (
    <div className="cheque-details cheque-details--loading" aria-busy="true">
      <div className="cheque-details__skeleton cheque-details__skeleton--title" />
      <div className="cheque-details__skeleton cheque-details__skeleton--subtitle" />
      <div className="cheque-details__skeleton-grid">
        <div className="cheque-details__skeleton cheque-details__skeleton--card" />
        <div className="cheque-details__skeleton cheque-details__skeleton--card" />
        <div className="cheque-details__skeleton cheque-details__skeleton--card" />
      </div>
      <div className="cheque-details__skeleton cheque-details__skeleton--timeline" />
    </div>
  );
}
