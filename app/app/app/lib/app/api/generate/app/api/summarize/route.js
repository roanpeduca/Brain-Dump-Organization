import {
  findCallout,
  getChildren,
  appendChildren,
  todoText,
  isChecked,
} from "../../lib/notion";

export async function POST() {
  try {
    const callout = await findCallout();
    const children = await getChildren(callout.id);
    const todos = children.filter((b) => b.type === "to_do");

    const listText = todos
      .map((b) => (isChecked(b) ? "[done] " : "[pending] ") + todoText(b))
      .join("\n");

    if (!todos.length) {
      return Response.json({ error: "No tasks found in the TO DOs callout yet" }, { status: 400 });
    }

    const systemPrompt =
      "Write a short (3-5 sentence), specific, encouraging end-of-day summary based on the task list below. " +
      "Mention specific completed items by name where it helps, not generic praise. Note anything still pending without guilt-tripping. " +
      "End with one specific encouraging line tied to what actually got done today. Respond with plain text only, no markdown, no headers.";

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: listText }],
      }),
    });
    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error("Claude API error: " + errText);
    }
    const claudeData = await claudeRes.json();
    const textBlock = claudeData.content.find((b) => b.type === "text");
    const summary = textBlock.text.trim();

    const done = todos.filter(isChecked).length;
    const heading = `Day summary — ${done} of ${todos.length} tasks done`;

    const pageId = process.env.NOTION_PAGE_ID;
    await appendChildren(
      pageId,
      [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: heading }, annotations: { bold: true } },
            ],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: summary } }],
          },
        },
      ],
      callout.id
    );

    return Response.json({ summary });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
