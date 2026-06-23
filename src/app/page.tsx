import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { homeForUser } from '@/lib/routes/role-routes';

// Root entry: route to the correct portal, or to login.
export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  redirect(homeForUser(user));
}
