const NOTION_VERSION = "2022-06-28";

function headers() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

export async function getChildren(blockId) {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error("Notion read failed: " + res.status);
  const data = await res.json();
  return data.results;
}

export async function findCallout() {
  const pageId = process.env.NOTION_PAGE_ID;
  const children = await getChildren(pageId);
  const callout = children.find((b) => b.type === "callout");
  if (!callout) throw new Error("No callout block found on the Brain Dump page");
  return callout;
}

export async function deleteBlock(blockId) {
  const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Notion delete failed: " + res.status);
}

export async function appendChildren(blockId, children, after) {
  const body = { children };
  if (after) body.after = after;
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${blockId}/children`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error("Notion write failed: " + res.status);
  const data = await res.json();
  return data.results;
}

export async function updateBlock(blockId, payload) {
  const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Notion update failed: " + res.status);
  return res.json();
}

function plainText(richTextArr) {
  return (richTextArr || []).map((r) => r.plain_text || "").join("");
}

export function todoText(block) {
  if (block.type !== "to_do") return "";
  return plainText(block.to_do.rich_text);
}

export function isChecked(block) {
  return block.type === "to_do" && !!block.to_do.checked;
}
