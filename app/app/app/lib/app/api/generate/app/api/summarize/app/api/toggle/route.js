import { updateBlock } from "../../lib/notion";

export async function POST(request) {
  try {
    const { blockId, checked } = await request.json();
    if (!blockId) throw new Error("Missing blockId");
    await updateBlock(blockId, { to_do: { checked: !!checked } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
