import { Linking, Pressable, Text, View } from 'react-native';
import type { Video } from '@eduotaga/types';
import { EmptyState } from '@/components/empty-state';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function VideoList({ videos }: { videos: Video[] }) {
  const theme = useThemeColors();

  if (videos.length === 0) {
    return <EmptyState title="No videos yet" description="Video walkthroughs will appear here." />;
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {videos.map((video) => (
        <Pressable
          key={video.id}
          onPress={() => Linking.openURL(video.url)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            padding: theme.spacing.sm,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radii.sm,
              backgroundColor: `${theme.colors.primary}1A`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text>▶️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.foreground, fontWeight: '600' }} numberOfLines={1}>
              {video.title}
            </Text>
            {video.description && (
              <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm }} numberOfLines={2}>
                {video.description}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}
