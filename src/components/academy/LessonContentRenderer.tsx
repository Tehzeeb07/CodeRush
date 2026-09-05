"use client";

/**
 * Renders a lesson's structured `content` blocks (headings, paragraphs,
 * lists, code, images, links, notes, warnings, tips) into premium styled
 * HTML. Runnable code examples are rendered via CodePlayground.
 */

import { useState } from "react";
import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import CodePlayground from "./CodePlayground";

export type ContentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language: string; code: string; caption?: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "link"; text: string; url: string }
  | { type: "note"; text: string }
  | { type: "warning"; text: string }
  | { type: "tip"; text: string };
function Callout({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  tone: "note" | "warning" | "tip";
}) {
  const styles = {
    note: "border-blue-500/20 bg-blue-500/[0.06] text-blue-200",
    warning: "border-amber-500/20 bg-amber-500/[0.06] text-amber-200",
    tip: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-200",
  } as const;
  const IconComp = Icon;
  return (
    <div className={`my-5 flex gap-3 rounded-xl border p-4 ${styles[tone]}`}>
      <IconComp size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-sm leading-relaxed opacity-90">{body}</p>
      </div>
    </div>
  );
}

function CodeCaptioned({
  language,
  code,
  caption,
}: {
  language: string;
  code: string;
  caption?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] font-medium text-neutral-400 transition-colors hover:text-white"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#0a0a0a] p-4 text-[13px] leading-relaxed text-neutral-200">
        <code>{code}</code>
      </pre>
      {caption && (
        <div className="border-t border-white/[0.08] px-4 py-2 text-xs text-neutral-500">
          {caption}
        </div>
      )}
    </div>
  );
}

function Heading({ level, text }: { level: 1 | 2 | 3; text: string }) {
  const cls =
    level === 1
      ? "text-2xl font-bold text-white"
      : level === 2
        ? "text-lg font-semibold text-white"
        : "text-base font-semibold text-neutral-200";
  const margin = level === 1 ? "mt-2 mb-3" : "mt-6 mb-2";
  if (level === 1) return <h1 className={`${cls} ${margin}`}>{text}</h1>;
  if (level === 2) return <h2 className={`${cls} ${margin}`}>{text}</h2>;
  return <h3 className={`${cls} ${margin}`}>{text}</h3>;
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return <Heading level={block.level} text={block.text} />;
    case "paragraph":
      return <p className="mb-4 text-[15px] leading-relaxed text-neutral-300">{block.text}</p>;
    case "list":
      return block.ordered ? (
        <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-[15px] text-neutral-300">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <ul className="mb-4 list-disc space-y-1.5 pl-6 text-[15px] text-neutral-300">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "code":
      return <CodeCaptioned language={block.language} code={block.code} caption={block.caption} />;
    case "image":
      return (
        <figure className="my-5 overflow-hidden rounded-xl border border-white/[0.08]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt ?? ""} className="w-full" />
          {block.caption && (
            <figcaption className="px-4 py-2.5 text-center text-xs text-neutral-500">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "link":
      return (
        <p className="mb-4">
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 underline decoration-indigo-400/30 underline-offset-2 hover:text-indigo-200"
          >
            {block.text}
          </a>
        </p>
      );
    case "note":
      return <Callout icon={Info} title="Note" body={block.text} tone="note" />;
    case "warning":
      return <Callout icon={AlertTriangle} title="Warning" body={block.text} tone="warning" />;
    case "tip":
      return <Callout icon={Lightbulb} title="Tip" body={block.text} tone="tip" />;
    default:
      return null;
  }
}

export default function LessonContentRenderer({
  content,
  codeExamples,
}: {
  content: ContentBlock[];
  codeExamples?: Array<{
    title?: string;
    language: string;
    code: string;
    expectedOutput?: string;
    explanation?: string;
  }> | null;
}) {
  return (
    <div className="academy-content">
      {content.map((block, i) => (
        <Block key={i} block={block} />
      ))}

      {codeExamples && codeExamples.length > 0 && (
        <div className="mt-8 space-y-5">
          {codeExamples.map((ex, i) => (
            <CodePlayground
              key={i}
              title={ex.title}
              language={ex.language}
              code={ex.code}
              expectedOutput={ex.expectedOutput}
              explanation={ex.explanation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
