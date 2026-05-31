'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { workflowTone } from '@/lib/utils/labels';

export function WorkflowBadge({ state }: { state: string | null | undefined }) {
  const t = useT();
  if (!state) return <>—</>;
  const key = `states.${state}`;
  const label = t(key);
  const text = label === key ? state : label;
  return <Badge tone={workflowTone(state)}>{text}</Badge>;
}
