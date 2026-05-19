import React from "react";
import { cn } from "@/lib/utils";

const codeClassName =
  "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground";

/** Highlights Solidity-ish tokens and backtick-wrapped spans in finding text. */
const INLINE_CODE_RE =
  /`[^`]+`|\btx\.origin\b|\bmsg\.sender\b|\bblock\.(timestamp|number)\b|\/\/\/|require\s*\([^)]{0,120}\)|assert\s*\([^)]{0,120}\)|\bu?int\d{0,3}\b|\bbytes\d{1,2}\b|\bbool\b|"[^"]{1,100}"/gi;

function stripBackticks(s: string) {
  return s.startsWith("`") && s.endsWith("`") ? s.slice(1, -1) : s;
}

export function FormattedCodeText({
  text,
  as: Tag = "span",
  className,
}: {
  text: string;
  as?: "span" | "p";
  className?: string;
}) {
  if (!text) return null;

  const re = new RegExp(INLINE_CODE_RE.source, "gi");
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const raw = match[0];
    nodes.push(
      <code key={match.index} className={codeClassName}>
        {stripBackticks(raw)}
      </code>,
    );
    last = match.index + raw.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return <Tag className={cn(className)}>{nodes}</Tag>;
}
