import {
  findCallout,
  getChildren,
  deleteBlock,
  appendChildren,
  todoText,
  isChecked,
} from "../../lib/notion";

export async function POST(request) {
  try {
    const { notes } = await request.json();

    const callout = await findCallout();
    const existing = await getChildren(callout.id);
    const carried = existing
      .filter((b) => b.type === "to_do" && !isChecked(b))
      .map((b) => todoText(b));

    const combined =
      "Carried-over unfinished tasks:\n" +
      (carried.join("\n") || "none") +
      "\n\nNew notes:\n" +
      (notes && notes.trim() ? notes.trim() : "none");

    const systemPrompt =
      'You are a task prioritizer for a Philippines-based tutor and independent operator. ' +
      'She has exactly two task buckets: "Tutorials" (Grade 6-7 tutoring work, evenings) and "Personal" (everything else: job search, her automation agency, an app called PAGER, LinkedIn, admin, errands). ' +
      "Sort the notes below into these two buckets only. Within each bucket apply the ABCDE method (A = must do, B = should do, C = nice to do, D = delegate, E = eliminate) and order tasks in strict Ivy Lee order, most important first. " +
      "Also write one short, specific, non-generic motivational quote with a real author. " +
      "Respond with ONLY valid JSON, no markdown fences, no commentary, in this exact shape: " +
      '{"quote": {"text": "...", "author": "..."}, "tasks": [{"bucket": "Tutorials", "priority": "A1", "text": "..."}]}';

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
        messages: [{ role: "user", content: combined }],
      }),
    });
    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error("Claude API error: " + errText);
    }
    const claudeData = await claudeRes.json();
    const textBlock = claudeData.content.find((b) => b.type === "text");
    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Clear the callout and rewrite it
    for (const child of existing) {
      await deleteBlock(child.id);
    }

    const quoteBlock = {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `"${parsed.quote.text}" — ${parsed.quote.author}`,
            },
            annotations: { italic: true },
          },
        ],
      },
    };

    const taskBlocks = (parsed.tasks || []).map((t) => ({
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [
          { type: "text", text: { content: `[${t.bucket} ${t.priority}] ${t.text}` } },
        ],
        checked: false,
      },
    }));

    const created = await appendChildren(callout.id, [quoteBlock, ...taskBlocks]);

    const createdTasks = created.slice(1).map((block, i) => ({
      id: block.id,
      bucket: parsed.tasks[i].bucket,
      priority: parsed.tasks[i].priority,
      text: parsed.tasks[i].text,
      done: false,
    }));

    return Response.json({ quote: parsed.quote, tasks: createdTasks });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
