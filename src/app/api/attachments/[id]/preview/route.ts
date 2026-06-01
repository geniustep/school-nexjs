import { forwardAttachmentBinary } from '@/lib/attachments/bff-binary';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardAttachmentBinary(id, 'preview');
}
