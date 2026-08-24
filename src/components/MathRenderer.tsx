import React from 'react';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = React.useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Helper to safely render KaTeX string
  const renderLatex = (latex: string, displayMode: boolean): string => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch {
      return latex;
    }
  };

  // Parse text containing code blocks, display math ($$...$$), inline math ($...$), and markdown formatting
  const renderFormattedContent = () => {
    if (!content) return null;

    // Split by code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockCounter = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(
          <div key={`text-${lastIndex}`} className="space-y-2">
            {renderTextWithMath(textBefore)}
          </div>
        );
      }

      const lang = match[1] || 'matlab';
      const code = match[2];
      const currentBlockIndex = blockCounter++;

      parts.push(
        <div
          key={`code-${currentBlockIndex}`}
          className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-[#0f172a] shadow-sm font-mono text-sm"
        >
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/90 text-slate-300 text-xs border-b border-slate-700/60 select-none">
            <span className="font-bold uppercase tracking-wider text-blue-400">
              {lang || 'MATLAB / CODE'}
            </span>
            <button
              onClick={() => copyToClipboard(code, currentBlockIndex)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
              title="Copiar código al portapapeles"
            >
              {copiedCodeIndex === currentBlockIndex ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-slate-200 overflow-x-auto text-[13px] leading-relaxed font-mono">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      parts.push(
        <div key={`text-${lastIndex}`} className="space-y-2">
          {renderTextWithMath(remainingText)}
        </div>
      );
    }

    return parts;
  };

  const renderTextWithMath = (text: string) => {
    // Process paragraphs/lines
    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map((para, pIdx) => {
      // Check if it's a list item
      const lines = para.split('\n');

      return (
        <div key={pIdx} className="leading-relaxed">
          {lines.map((line, lIdx) => {
            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
            const cleanLine = isBullet ? line.trim().substring(2) : line;

            const processedLine = parseInlineMathAndFormatting(cleanLine);

            if (isBullet) {
              return (
                <div key={lIdx} className="flex items-start gap-2 my-1 pl-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                  <span className="flex-1 text-slate-700">{processedLine}</span>
                </div>
              );
            }

            return (
              <p key={lIdx} className={lIdx > 0 ? 'mt-1 text-slate-700' : 'text-slate-700'}>
                {processedLine}
              </p>
            );
          })}
        </div>
      );
    });
  };

  const parseInlineMathAndFormatting = (text: string): React.ReactNode => {
    // Check for display math $$...$$
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const segments: React.ReactNode[] = [];
    let lastIdx = 0;
    let dMatch: RegExpExecArray | null;

    while ((dMatch = displayMathRegex.exec(text)) !== null) {
      const before = text.substring(lastIdx, dMatch.index);
      if (before) {
        segments.push(parseSingleLineMath(before, `sub-${lastIdx}`));
      }

      const latex = dMatch[1];
      const renderedHtml = renderLatex(latex, true);
      segments.push(
        <div
          key={`dmath-${dMatch.index}`}
          className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center overflow-x-auto text-blue-900 shadow-sm"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      );

      lastIdx = dMatch.index + dMatch[0].length;
    }

    const rest = text.substring(lastIdx);
    if (rest) {
      segments.push(parseSingleLineMath(rest, `sub-${lastIdx}`));
    }

    return segments;
  };

  const parseSingleLineMath = (str: string, keyPrefix: string): React.ReactNode => {
    // Split by inline math $...$
    const inlineMathRegex = /\$([^\$]+?)\$/g;
    const pieces: React.ReactNode[] = [];
    let last = 0;
    let iMatch: RegExpExecArray | null;
    let counter = 0;

    while ((iMatch = inlineMathRegex.exec(str)) !== null) {
      const plain = str.substring(last, iMatch.index);
      if (plain) {
        pieces.push(renderBoldItalic(plain, `${keyPrefix}-pl-${counter++}`));
      }

      const math = iMatch[1];
      const renderedHtml = renderLatex(math, false);
      pieces.push(
        <span
          key={`${keyPrefix}-m-${counter++}`}
          className="inline-block px-1 py-0.5 text-blue-700 font-medium font-serif"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      );

      last = iMatch.index + iMatch[0].length;
    }

    const tail = str.substring(last);
    if (tail) {
      pieces.push(renderBoldItalic(tail, `${keyPrefix}-pl-${counter++}`));
    }

    return pieces;
  };

  const renderBoldItalic = (raw: string, key: string): React.ReactNode => {
    // Simple bold **text** parsing
    const parts = raw.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={idx} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </span>
    );
  };

  return <div className={`text-slate-800 text-sm md:text-base ${className}`}>{renderFormattedContent()}</div>;
};
