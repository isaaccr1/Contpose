import { create } from 'zustand';

type AlertSeverity = 'low' | 'medium' | 'high';

type PostureAlert = {
  id: string;
  bodyPart: string;
  message: string;
  severity: AlertSeverity;
  createdAt: number;
};

type PostureState = {
  isAnalyzing: boolean;
  currentExercise: string;
  latestAlert: PostureAlert | null;
  setAnalyzing: (active: boolean) => void;
  setExercise: (exercise: string) => void;
  pushAlert: (alert: Omit<PostureAlert, 'id' | 'createdAt'>) => void;
  clearAlert: () => void;
};

const usePostureStore = create<PostureState>((set) => ({
  isAnalyzing: false,
  currentExercise: 'Sentadilla',
  latestAlert: null,
  setAnalyzing: (active) => set({ isAnalyzing: active }),
  setExercise: (exercise) => set({ currentExercise: exercise }),
  pushAlert: (alert) =>
    set({
      latestAlert: {
        ...alert,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
      },
    }),
  clearAlert: () => set({ latestAlert: null }),
}));

export default usePostureStore;
