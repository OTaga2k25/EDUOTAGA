import { Tabs } from 'expo-router';
import { Pressable, Appearance, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ThemeToggle() {
  const theme = useThemeColors();
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
}

export default function TabsLayout() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.foreground,
        tabBarStyle: { 
          backgroundColor: theme.colors.surface, 
          borderTopColor: theme.colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ color }) => {
          let name = 'home';
          if (route.name === 'index') name = 'home';
          else if (route.name === 'experiments') name = 'flask';
          else if (route.name === 'my-lab') name = 'bookmark';
          else if (route.name === 'search') name = 'search';
          
          return <Ionicons name={name as any} size={24} color={color} />;
        },
      })}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          headerTitle: () => (
            <Image
              source={require('../../assets/images/EduOtagalogo.png')}
              style={{ width: 40, height: 40, resizeMode: 'contain' }}
            />
          ),
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable style={{ paddingHorizontal: 16 }}>
              <Ionicons name="menu" size={28} color={theme.colors.foreground} />
            </Pressable>
          ),
          headerRight: () => <ThemeToggle />,
        }} 
      />
      <Tabs.Screen name="experiments" options={{ title: 'Experiments', headerShown: false }} />
      <Tabs.Screen name="my-lab" options={{ title: 'My Lab', headerShown: false }} />
      <Tabs.Screen name="search" options={{ title: 'Search', headerShown: false }} />
    </Tabs>
  );
}
