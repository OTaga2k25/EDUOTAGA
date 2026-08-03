import { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, UIManager, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExperimentSummary } from '@eduotaga/types';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ExperimentCard } from './experiment-card';



interface SubjectAccordionProps {
  subjectName: string;
  experiments: ExperimentSummary[];
}

export function SubjectAccordion({ subjectName, experiments }: SubjectAccordionProps) {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.foreground, shadowColor: theme.colors.foreground }]}>
      <Pressable
        onPress={toggleAccordion}
        style={({ pressed }) => [
          styles.header,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>{subjectName}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={theme.colors.foreground}
        />
      </Pressable>

      {isOpen && (
        <View style={styles.content}>
          {experiments.map((experiment) => (
            <View key={experiment.id} style={styles.cardWrapper}>
              <ExperimentCard experiment={experiment} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
});
