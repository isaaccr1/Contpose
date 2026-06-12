import { useEffect, useRef } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '@/lib/workoutService';

export interface WorkoutResult {
  exerciseName: string;
  totalReps: number;
  correctReps: number;
  duration: number;
  errorCounts: Record<string, number>;
}

interface Props {
  visible: boolean;
  result: WorkoutResult | null;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export default function WorkoutResultsModal({ visible, result, saving, onSave, onDiscard }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 15 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!result) return null;

  const incorrectReps = result.totalReps - result.correctReps;
  const accuracy = result.totalReps > 0 ? Math.round((result.correctReps / result.totalReps) * 100) : 0;
  const topErrors = Object.entries(result.errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const accuracyColor = accuracy >= 80 ? '#22c55e' : accuracy >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDiscard}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Entrenamiento Completado</Text>
              <Text style={styles.exerciseName}>{result.exerciseName}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <StatBox icon="time-outline" label="Duración" value={formatDuration(result.duration)} color="#3b82f6" />
              <StatBox icon="repeat-outline" label="Total Reps" value={String(result.totalReps)} color="#8b5cf6" />
              <StatBox icon="checkmark-circle-outline" label="Correctas" value={String(result.correctReps)} color="#22c55e" />
              <StatBox icon="close-circle-outline" label="Incorrectas" value={String(incorrectReps)} color="#ef4444" />
            </View>

            {/* Accuracy bar */}
            <View style={styles.accuracyContainer}>
              <View style={styles.accuracyRow}>
                <Text style={styles.accuracyLabel}>Precisión de forma</Text>
                <Text style={[styles.accuracyValue, { color: accuracyColor }]}>{accuracy}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${accuracy}%` as any, backgroundColor: accuracyColor }]} />
              </View>
            </View>

            {/* Error breakdown */}
            {topErrors.length > 0 && (
              <View style={styles.errorsContainer}>
                <Text style={styles.errorsTitle}>Errores detectados</Text>
                {topErrors.map(([label, count]) => (
                  <View key={label} style={styles.errorRow}>
                    <View style={styles.errorDot} />
                    <Text style={styles.errorLabel}>{label.replace('! ', '')}</Text>
                    <Text style={styles.errorCount}>{count}x</Text>
                  </View>
                ))}
              </View>
            )}

            {topErrors.length === 0 && result.totalReps > 0 && (
              <View style={styles.perfectContainer}>
                <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
                <Text style={styles.perfectText}>¡Excelente forma! Sin errores posturales.</Text>
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.discardButton} onPress={onDiscard} disabled={saving}>
              <Text style={styles.discardText}>Descartar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
              {saving ? (
                <Text style={styles.saveText}>Guardando...</Text>
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.saveText}>Guardar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    padding: 20,
    paddingBottom: 18,
  },
  checkCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    color: '#bfdbfe',
    fontFamily: 'Roboto',
  },
  exerciseName: {
    fontSize: 20,
    color: '#fff',
    fontFamily: 'RobotoBold',
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'RobotoBold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Roboto',
  },
  accuracyContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  accuracyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accuracyLabel: {
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Roboto',
  },
  accuracyValue: {
    fontSize: 15,
    fontFamily: 'RobotoBold',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  errorsContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  errorsTitle: {
    fontSize: 13,
    fontFamily: 'RobotoBold',
    color: '#991b1b',
    marginBottom: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  errorLabel: {
    flex: 1,
    fontSize: 13,
    color: '#7f1d1d',
    fontFamily: 'Roboto',
  },
  errorCount: {
    fontSize: 12,
    fontFamily: 'RobotoBold',
    color: '#ef4444',
  },
  perfectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  perfectText: {
    fontSize: 13,
    color: '#92400e',
    fontFamily: 'Roboto',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  discardButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  discardText: {
    fontSize: 15,
    fontFamily: 'RobotoBold',
    color: '#475569',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a8a',
  },
  saveText: {
    fontSize: 15,
    fontFamily: 'RobotoBold',
    color: '#fff',
  },
});
