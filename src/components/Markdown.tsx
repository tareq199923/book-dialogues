"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownProps {
  children: string;
}

const components: Partial<Components> = {
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-2 border-rule pl-4 py-1 my-2 text-muted italic" {...props}>
      {children}
    </blockquote>
  ),
  pre: ({ children, ...props }) => (
    <pre className="bg-[#F0EFEA] rounded px-3 py-2 my-2 overflow-x-auto text-sm" {...props}>
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="font-mono text-[0.875em] bg-[#F0EFEA] text-mark px-1 py-0.5 rounded" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-[0.875em] text-mark" {...props}>
        {children}
      </code>
    );
  },
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside marker:text-mark space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside marker:text-mark space-y-1" {...props}>
      {children}
    </ol>
  ),
};

export default function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  );
}
