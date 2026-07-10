import { Tabs } from 'expo-router';
import { Text, View, Pressable, Appearance, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/use-theme-colors';



export default function TabsLayout() {
  const theme = useThemeColors();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.foreground,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ color }) => {
          const name = route.name === 'index' ? 'home' : route.name === 'subjects' ? 'flask' : 'search';
          return <Ionicons name={name} size={24} color={color} />;
        },
      })}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          headerTitle: () => (
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="beaker" size={24} color={theme.colors.primary} />
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.foreground, lineHeight: 16 }}>edUOtaga</Text>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Virtual Labs</Text>
                </View>
             </View>
          ),
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable style={{ paddingHorizontal: 16 }}>
              <Ionicons name="menu" size={28} color={theme.colors.foreground} />
            </Pressable>
          ),
          headerRight: () => {
            const scheme = useColorScheme();
            return (
              <Pressable 
                style={{ paddingHorizontal: 16 }}
                onPress={() => {
                  Appearance.setColorScheme(scheme === 'dark' ? 'light' : 'dark');
                }}
              >
                <Ionicons 
                  name={scheme === 'dark' ? 'sunny' : 'moon'} 
                  size={24} 
                  color={theme.colors.foreground} 
                />
              </Pressable>
            );
          },
        }} 
      />
      <Tabs.Screen name="subjects" options={{ title: 'Subjects' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
    </Tabs>
  );
}
