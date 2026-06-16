import { redirect } from 'next/navigation';

/** Legacy route — unified fee catalog lives inside fee plans workspace. */
export default function AdminFinanceFeeTypesRedirectPage() {
  redirect('/admin/finance/fee-plans?catalog=open');
}
