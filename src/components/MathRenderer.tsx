
"use client";

import React from "react";
import katex from "katex";

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({
  content,
  className = "",
}: MathRendererProps) {
  if (!content) return null;

  const renderMath = (expression: string, displayMode = false, key?: string | number) => {
    try {
      const html = katex.renderToString(expression.trim(), {
        displayMode,
        throwOnError: false,
        strict: "ignore",
        output: "html",
      });

      return (
        <span
          key={key}
          className={displayMode ? "my-2 block overflow-x-auto" : "inline"}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return <span key={key}>{expression}</span>;
    }
  };

  const parseContent = (text: string) => {
    const normalized = text.trim();
    const tokens = normalized.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);

    return tokens.map((part, index) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        return renderMath(part.slice(2, -2), true, index);
      }

      if (part.startsWith("$") && part.endsWith("$")) {
        return renderMath(part.slice(1, -1), false, index);
      }

      // Render common plain-text equations returned by the AI.
      const looksLikeMath =
  /(?:\\frac|\\sqrt|\\int|\\sum|\\partial|\\neq|\\leq|\\geq)/.test(part) &&
  part.trim().startsWith("\\");

      if (looksLikeMath) {
        const expression = part
          .replace(/\\\(/g, "")
          .replace(/\\\)/g, "")
          .replace(/\\\[/g, "")
          .replace(/\\\]/g, "")
          .replace(/dy\/dx/g, "\\frac{dy}{dx}")
          .replace(/d\/dx/g, "\\frac{d}{dx}")
          .replace(/\b([a-zA-Z])\^(\d+)/g, "$1^{$2}")
          .replace(/\*/g, "\\cdot ");

        return renderMath(expression, false, index);
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
