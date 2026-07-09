import { describe, expect, it } from 'vitest';
import {
  looksLikeRecordId,
  sanitizeAnalyticsPathname,
  sanitizeAnalyticsUrl,
} from './sanitize-analytics-url';

describe('sanitizeAnalyticsPathname', () => {
  it('redacts student detail record ids', () => {
    expect(sanitizeAnalyticsPathname('/admin/students/7013')).toBe('/admin/students/[id]');
  });

  it('redacts admission detail record ids', () => {
    expect(sanitizeAnalyticsPathname('/admin/admissions/114')).toBe('/admin/admissions/[id]');
  });

  it('redacts finance receipt and collection detail ids', () => {
    expect(sanitizeAnalyticsPathname('/admin/finance/receipts/123')).toBe(
      '/admin/finance/receipts/[id]',
    );
    expect(sanitizeAnalyticsPathname('/admin/finance/collections/456')).toBe(
      '/admin/finance/collections/[id]',
    );
  });

  it('redacts nested parent child and finance collection ids', () => {
    expect(
      sanitizeAnalyticsPathname('/parent/children/88/finance/collections/901'),
    ).toBe('/parent/children/[id]/finance/collections/[id]');
  });

  it('leaves normal dashboard routes unchanged', () => {
    expect(sanitizeAnalyticsPathname('/admin/finance')).toBe('/admin/finance');
    expect(sanitizeAnalyticsPathname('/admin')).toBe('/admin');
  });
});

describe('sanitizeAnalyticsUrl', () => {
  it('removes search query values containing person names or identifiers', () => {
    expect(
      sanitizeAnalyticsUrl('https://school.raqeem.ma/admin/students?search=Ahmed%20Benali'),
    ).toBe('https://school.raqeem.ma/admin/students');

    expect(
      sanitizeAnalyticsUrl('/admin/finance/receipts?student_id=7013&state=posted'),
    ).toBe('/admin/finance/receipts?state=posted');
  });

  it('sanitizes returnTo paths embedded in query strings', () => {
    expect(
      sanitizeAnalyticsUrl(
        '/admin/finance/receipts/55?returnTo=%2Fadmin%2Fstudents%2F7013%3Ftab%3Dfinance',
      ),
    ).toBe('/admin/finance/receipts/[id]?returnTo=%2Fadmin%2Fstudents%2F%5Bid%5D%3Ftab%3Dfinance');
  });

  it('removes email, phone, and token query parameters', () => {
    expect(
      sanitizeAnalyticsUrl('/login?email=user%40school.ma&phone=0612345678&token=abc123'),
    ).toBe('/login');
  });
});

describe('looksLikeRecordId', () => {
  it('detects numeric and uuid identifiers', () => {
    expect(looksLikeRecordId('7013')).toBe(true);
    expect(looksLikeRecordId('dashboard')).toBe(false);
    expect(looksLikeRecordId('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe(true);
  });
});
