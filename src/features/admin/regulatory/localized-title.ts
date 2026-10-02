import type { RegulatoryReferenceItem } from './types';

export function localizedRegulatoryTitle(
  item: Pick<RegulatoryReferenceItem, 'title' | 'title_fr'>,
  locale: string,
): string {
  const frenchTitle = item.title_fr?.trim();
  return locale.toLowerCase().startsWith('fr') && frenchTitle ? frenchTitle : item.title;
}
