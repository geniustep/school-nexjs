import { redirect } from 'next/navigation';

export default async function AdminTeachingAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  const query = params.toString();
  redirect(`/admin/settings/academic-setup/assignments${query ? `?${query}` : ''}`);
}
