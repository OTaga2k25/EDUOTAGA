import { Fragment } from 'react';

/**
 * Renders `**bold**` markdown-lite content without pulling in a full
 * markdown dependency — theory/observation copy only ever needs emphasis.
 */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function RichText({ content, className }: { content: string; className?: string }) {
  const paragraphs = content.split(/\n{2,}/);
  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="leading-relaxed text-foreground/90">
          {renderInline(paragraph)}
        </p>
      ))}
    </div>
  );
}
