/**
 * Renders structured data as a single `@graph` document.
 *
 * One graph per page (rather than several loose <script> tags) lets nodes
 * cross-reference each other by `@id`, so the Organization and WebSite
 * entities are declared once and merely pointed at from everywhere else.
 */
export function JsonLd({ schema }: { schema: object | object[] }) {
  const graph = Array.isArray(schema) ? schema : [schema];

  return (
    <script
      type="application/ld+json"
      // Content is built from our own trusted data files, never user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
          /</g,
          '\u003c',
        ),
      }}
    />
  );
}
