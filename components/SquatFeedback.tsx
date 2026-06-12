import { View, Text, StyleSheet } from 'react-native';
import { SquatState } from '@/lib/squatDetector';

interface Props {
  state: SquatState;
}

export default function SquatFeedback({ state }: Props) {
  if (state.lowVisibility) {
    return (
      <View style={styles.container}>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>Ajusta tu posición frente a la cámara</Text>
          <Text style={styles.warningHint}>Colócate de perfil para mejor detección</Text>
        </View>
      </View>
    );
  }

  const panelColor = state.badPosture ? '#7f1d1d' : '#14532d';

  return (
    <View style={styles.container}>
      {/* Panel superior: reps + fase */}
      <View style={[styles.topPanel, { backgroundColor: panelColor }]}>
        <View style={styles.repSection}>
          <Text style={styles.repNumber}>{state.repCount}</Text>
          <Text style={styles.repLabel}>REPS</Text>
        </View>
        {state.phase !== 'idle' && (
          <Text style={styles.phase}>
            {state.phase === 'down' ? '▼ ABAJO' : '▲ ARRIBA'}
          </Text>
        )}
        {state.kneeAngle != null && (
          <Text style={styles.angleLabel}>Rodilla: {Math.round(state.kneeAngle)}°</Text>
        )}
      </View>

      {/* Feedback de postura */}
      <View style={styles.feedbackArea}>
        {state.issues.length > 0 ? (
          state.issues.map((issue, i) => (
            <View key={i} style={styles.issueBox}>
              <Text style={styles.issueText}>{issue.label}</Text>
              <Text style={styles.issueHint}>{issue.message}</Text>
            </View>
          ))
        ) : (
          state.phase === 'down' && (
            <View style={styles.goodBox}>
              <Text style={styles.goodText}>✓ Buena postura</Text>
            </View>
          )
        )}

        {state.lastRepCounted && (
          <View style={styles.countedBox}>
            <Text style={styles.countedText}>+1 rep contada ✓</Text>
          </View>
        )}
        {!state.lastRepCounted && state.hadBadPostureDuringRep && state.phase === 'up' && (
          <View style={styles.notCountedBox}>
            <Text style={styles.notCountedText}>Rep no contada — corrige postura</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  warningBox: {
    margin: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  topPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  repSection: {
    alignItems: 'center',
  },
  repNumber: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  repLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  phase: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  angleLabel: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '500',
  },
  feedbackArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 6,
  },
  issueBox: {
    backgroundColor: 'rgba(185,28,28,0.85)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  issueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  issueHint: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 1,
  },
  goodBox: {
    backgroundColor: 'rgba(21,128,61,0.85)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goodText: {
    color: '#86efac',
    fontSize: 14,
    fontWeight: '700',
  },
  countedBox: {
    backgroundColor: 'rgba(21,128,61,0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  countedText: {
    color: '#bbf7d0',
    fontSize: 15,
    fontWeight: '700',
  },
  notCountedBox: {
    backgroundColor: 'rgba(180,83,9,0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  notCountedText: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
