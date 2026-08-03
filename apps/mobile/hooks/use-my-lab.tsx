import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MyLabContextType {
  savedIds: string[];
  toggleSave: (experimentId: string) => Promise<void>;
  isSaved: (experimentId: string) => boolean;
}

const MyLabContext = createContext<MyLabContextType | null>(null);

export function MyLabProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadSaved() {
      try {
        const stored = await AsyncStorage.getItem('eduotaga-mylab');
        if (stored) {
          setSavedIds(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load my lab', e);
      }
    }
    loadSaved();
  }, []);

  const toggleSave = async (experimentId: string) => {
    try {
      const isAlreadySaved = savedIds.includes(experimentId);
      let nextIds: string[];
      if (isAlreadySaved) {
        nextIds = savedIds.filter(id => id !== experimentId);
      } else {
        nextIds = [...savedIds, experimentId];
      }
      setSavedIds(nextIds);
      await AsyncStorage.setItem('eduotaga-mylab', JSON.stringify(nextIds));
    } catch (e) {
      console.error('Failed to toggle my lab', e);
    }
  };

  const isSaved = (experimentId: string) => savedIds.includes(experimentId);

  return (
    <MyLabContext.Provider value={{ savedIds, toggleSave, isSaved }}>
      {children}
    </MyLabContext.Provider>
  );
}

export function useMyLab() {
  const context = useContext(MyLabContext);
  if (!context) {
    throw new Error('useMyLab must be used within a MyLabProvider');
  }
  return context;
}
