import { forwardOdooWebBinary } from '@/lib/api/forward-odoo-web-binary';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return forwardOdooWebBinary(path);
}
