'use client';

import { useT } from '@/features/i18n/locale-context';
import { BRAND_ASSETS, BRAND_DIMENSIONS } from '@/lib/brand-assets';
import { cn } from '@/lib/utils/cn';

type BrandVariant = 'full' | 'compact';

export function BrandLogo({
  variant = 'full',
  className,
}: {
  variant?: BrandVariant;
  className?: string;
}) {
  const t = useT();
  const name = t('brand.name');
  const isCompact = variant === 'compact';
  const src = isCompact ? BRAND_ASSETS.mark : BRAND_ASSETS.full;
  const dims = isCompact ? BRAND_DIMENSIONS.mark : BRAND_DIMENSIONS.full;

  return (
    <img
      src={src}
      alt={name}
      width={dims.width}
      height={dims.height}
      className={cn(isCompact ? 'brand-logo__mark' : 'brand-logo__full', className)}
      decoding="async"
      fetchPriority={variant === 'full' ? 'high' : 'auto'}
    />
  );
}
