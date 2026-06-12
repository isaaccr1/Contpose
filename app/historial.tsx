import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { getAllWorkouts, WorkoutRecord, formatDuration, formatWorkoutDate } from '@/lib/workoutService';

export default function Historial() {
  const { session } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    getAllWorkouts(session.user.id).then((data) => {
      setWorkouts(data);
      setLoading(false);
    });
  }, [session?.user?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
          <Text style={styles.backText}>Inicio</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bar-chart-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Sin entrenamientos aún</Text>
          <Text style={styles.emptySubtitle}>Tus entrenamientos guardados aparecerán aquí.</Text>
          <TouchableOpacity style={styles.startButton} onPress={() => router.push('/camera')}>
            <Text style={styles.startButtonText}>Comenzar entrenamiento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.countLabel}>{workouts.length} entrenamientos en total</Text>
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function WorkoutCard({ workout }: { workout: WorkoutRecord }) {
  const totalCorrect  = workout.sets.reduce((s, x) => s + x.repeticiones, 0);
  const totalAttempts = workout.sets.reduce((s, x) => s + x.repeticiones + x.errores_postura, 0);
  const accuracy      = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const exerciseNames = [...new Set(workout.sets.map((s) => s.exercises?.nombre).filter(Boolean))];
  const accuracyColor = accuracy >= 80 ? '#22c55e' : accuracy >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="barbell-outline" size={18} color="#1e3a8a" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardExercise}>
            {exerciseNames.length > 0 ? exerciseNames.join(', ') : 'Entrenamiento'}
          </Text>
          <Text style={styles.cardDate}>{formatWorkoutDate(workout.fecha)}</Text>
        </View>
        <View style={[styles.accuracyBadge, { backgroundColor: `${accuracyColor}22` }]}>
          <Text style={[styles.accuracyText, { color: accuracyColor }]}>{accuracy}%</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatChip icon="time-outline" value={formatDuration(workout.duracion)} label="Duración" />
        <StatChip icon="repeat-outline" value={String(totalAttempts)} label="Reps totales" />
        <StatChip icon="checkmark-circle-outline" value={String(totalCorrect)} label="Correctas" />
      </View>
    </View>
  );
}

function StatChip({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon as any} size={14} color="#64748b" />
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef4ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f239c',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  emptyTitle: { fontSize: 18, fontFamily: 'RobotoBold', color: '#1e293b', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  startButton: {
    marginTop: 24,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  startButtonText: { color: '#fff', fontFamily: 'RobotoBold', fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  countLabel: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Roboto',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardExercise: { fontSize: 15, fontFamily: 'RobotoBold', color: '#1e293b' },
  cardDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  accuracyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  accuracyText: { fontSize: 13, fontFamily: 'RobotoBold' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  statChipValue: { fontSize: 14, fontFamily: 'RobotoBold', color: '#1e293b' },
  statChipLabel: { fontSize: 10, color: '#94a3b8' },
});
