"use client";

import React from "react";
import katex from "katex";

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({ content, className = "" }: MathRendererProps) {
  if (!content) return null;

  const renderMathBlock = (mathStr: string, isBlock: boolean) => {
    try {
      const clean = mathStr
        .replace(/^\$\$|\$\$$/g, "")
        .replace(/^\$|\$$/g, "")
        .trim();

      const html = katex.renderToString(clean, {
        displayMode: isBlock,
        throwOnError: false,
      });

      return <span key={Math.random()} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span>{mathStr}</span>;
    }
  };

  const parseContent = (text: string) => {
    const normalized = text.trim();
    const tokens = normalized.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

    return tokens.map((part, index) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        return renderMathBlock(part, true);
      }
      if (part.startsWith("$") && part.endsWith("$")) {         return renderMathBlock(part, false);       }       if (part.startsWith("$$")) {
        return renderMathBlock(part.slice(2), false);
      }
      if (part.startsWith("$")) {
        return renderMathBlock(part.slice(1), false);
      }
      if (/\\(int|frac|lim|sum|sqrt|neq|alpha|beta|theta|pi|partial)/.test(part)) {
        return renderMathBlock(part, false);
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <span className={`inline-block leading-relaxed ${className}`}>
      {parseContent(content)}
    </span>
  );
}