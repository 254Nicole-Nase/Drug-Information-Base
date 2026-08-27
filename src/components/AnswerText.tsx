/**
 * Minimal renderer for the constrained markdown the answer prompt asks for:
 * a lead sentence, bullets with **bold** lead-ins, and [Brand, Section] citations.
 * Deliberately tiny — no markdown dependency, no HTML injection surface.
 */

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("[") && part.endsWith("]")) {
      return (
        <span
          key={key}
          className="ml-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 align-baseline text-[11px] font-medium text-primary"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

export function AnswerText({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: Array<{ type: "p" | "ul"; items: string[] }> = [];
  for (const line of lines) {
    const bullet = /^([-*•]|\d+\.)\s+/.exec(line);
    if (bullet) {
      const content = line.slice(bullet[0].length);
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(content);
      else blocks.push({ type: "ul", items: [content] });
    } else {
      blocks.push({ type: "p", items: [line.replace(/^#+\s*/, "")] });
    }
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, blockIndex) =>
        block.type === "ul" ? (
          <ul key={blockIndex} className="space-y-2.5">
            {block.items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="relative rounded-xl border border-border/70 bg-gradient-surface px-4 py-3 pl-9"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-3.5 top-[1.15rem] h-1.5 w-1.5 rounded-full bg-primary"
                />
                {renderInline(item, `b${blockIndex}-${itemIndex}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p key={blockIndex} className="text-[0.95rem] text-foreground">
            {renderInline(block.items[0] ?? "", `p${blockIndex}`)}
          </p>
        ),
      )}
    </div>
  );
}
