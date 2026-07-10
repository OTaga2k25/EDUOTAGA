import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

function renderInline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={`${key}-${index}`} style={{ fontWeight: '700' }}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Fragment key={`${key}-${index}`}>{part}</Fragment>
    ),
  );
}

export function RichText({ content }: { content: string }) {
  const theme = useThemeColors();
  const paragraphs = content.split(/\n{2,}/);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {paragraphs.map((paragraph, index) => (
        <Text
          key={index}
          style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes.base, lineHeight: 24 }}
        >
          {renderInline(paragraph, String(index))}
        </Text>
      ))}
    </View>
  );
}
