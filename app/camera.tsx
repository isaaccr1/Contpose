import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { router } from 'expo-router';
import usePostureStore from '@/stores/posture';
import { getPoseTemplate, PoseTemplate } from '@/lib/poseTemplates';
import { initPoseDetectorAsync, estimatePoseFromCameraAsync } from '@/lib/poseDetector';
import { getPoseAlerts, normalizePoseResult } from '@/lib/poseUtils';
import { analyzeSquatFrame, createInitialSquatState, SquatState } from '@/lib/squatDetector';
import SquatFeedback from '@/components/SquatFeedback';

export default function CameraModule() {
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<any>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [template, setTemplate] = useState<PoseTemplate | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [squatState, setSquatState] = useState<SquatState>(createInitialSquatState());
  const squatStateRef = useRef<SquatState>(createInitialSquatState());

  const { isAnalyzing, currentExercise, latestAlert, setAnalyzing, setExercise, pushAlert, clearAlert } =
    usePostureStore();

  const isSquatMode = currentExercise === 'Sentadilla' && isAnalyzing;

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermissionGranted(status === 'granted');
    } catch {
      setPermissionGranted(false);
    }
  };

  useEffect(() => { requestCameraPermission(); }, []);

  useEffect(() => {
    setTemplate(getPoseTemplate(currentExercise));
  }, [currentExercise]);

  useEffect(() => {
    (async () => {
      try {
        await initPoseDetectorAsync();
        setDetectorReady(true);
      } catch (e) {
        console.warn('Error inicializando detector de pose', e);
      }
    })();
  }, []);

  // Keep squatStateRef in sync so the interval closure always has fresh state
  useEffect(() => {
    squatStateRef.current = squatState;
  }, [squatState]);

  const analyzeCurrentFrame = async () => {
    if (!detectorReady || !cameraRef.current) return;

    try {
      const pose = await estimatePoseFromCameraAsync(cameraRef);
      if (!pose) return;

      if (isSquatMode || currentExercise === 'Sentadilla') {
        // Squat mode: use raw keypoints for rep counting + posture
        const newState = analyzeSquatFrame(pose.keypoints ?? [], squatStateRef.current);
        squatStateRef.current = newState;
        setSquatState(newState);
      } else {
        // Generic mode: template-based alerts
        if (!template) return;
        const normalized = normalizePoseResult(pose);
        const alerts = getPoseAlerts(normalized, template);
        if (alerts.length > 0) pushAlert(alerts[0]);
        else clearAlert();
      }
    } catch (e) {
      console.warn('Error analizando frame', e);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isAnalyzing && detectorReady) {
      analyzeCurrentFrame();
      // 500ms for squats (needs frequent sampling for rep counting)
      const ms = currentExercise === 'Sentadilla' ? 500 : 1500;
      interval = setInterval(analyzeCurrentFrame, ms);
    }

    return () => { if (interval) clearInterval(interval); };
  }, [isAnalyzing, detectorReady, currentExercise]);

  const selectExercise = (exercise: string) => {
    if (exercise === 'Sentadilla') {
      setSquatState(createInitialSquatState());
      squatStateRef.current = createInitialSquatState();
    }
    setExercise(exercise);
    setAnalyzing(true);
  };

  const stopAnalysis = () => {
    setAnalyzing(false);
    clearAlert();
    setSquatState(createInitialSquatState());
    squatStateRef.current = createInitialSquatState();
  };

  if (permissionGranted === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.infoText}>Comprobando permisos de cámara...</Text>
      </SafeAreaView>
    );
  }

  if (!permissionGranted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="videocam-off" size={48} color="#64748b" />
        <Text style={styles.title}>Permiso de cámara requerido</Text>
        <Text style={styles.infoText}>
          Este módulo necesita la cámara para análisis en vivo de postura.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestCameraPermission}>
          <Text style={styles.primaryButtonText}>Conceder permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
          <Text style={styles.backText}>Inicio</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAnalyzing ? currentExercise : 'Módulo Cámara'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

        {/* Squat overlay */}
        {isSquatMode && <SquatFeedback state={squatState} />}

        {/* Generic posture overlay (non-squat exercises) */}
        {isAnalyzing && !isSquatMode && (
          <View style={styles.overlay}>
            <View style={styles.feedbackBox}>
              <Text style={styles.exerciseLabel}>{currentExercise}</Text>
              {latestAlert ? (
                <>
                  <Text
                    style={[
                      styles.alert,
                      { color: latestAlert.severity === 'high' ? '#ef4444' : '#f97316' },
                    ]}
                  >
                    {latestAlert.message}
                  </Text>
                  <Text style={styles.bodyPart}>{latestAlert.bodyPart}</Text>
                </>
              ) : (
                <Text style={styles.goodPosture}>✓ Postura correcta</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isAnalyzing ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.buttonSentadilla]}
              onPress={() => selectExercise('Sentadilla')}
            >
              <Ionicons name="barbell" size={20} color="#fff" />
              <Text style={styles.buttonText}>Sentadilla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonAbdominales]}
              onPress={() => selectExercise('Abdominales')}
            >
              <Ionicons name="body" size={20} color="#fff" />
              <Text style={styles.buttonText}>Abdominales</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.button, styles.buttonStop]} onPress={stopAnalysis}>
            <Ionicons name="stop-circle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Detener</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        >
          <Ionicons name="camera-reverse" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {isAnalyzing && (
        <View style={styles.statusBar}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {isSquatMode
              ? `Analizando sentadillas — ${detectorReady ? 'detector activo' : 'iniciando...'}`
              : 'Analizando postura en vivo'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  cameraContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  feedbackBox: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 16,
    minWidth: 240,
    alignItems: 'center',
  },
  exerciseLabel: { color: '#60a5fa', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  alert: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  bodyPart: { color: '#cbd5e1', fontSize: 11, marginTop: 4 },
  goodPosture: { color: '#4ade80', fontSize: 14, fontWeight: '600' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonSentadilla: { backgroundColor: '#3b82f6', flex: 1 },
  buttonAbdominales: { backgroundColor: '#8b5cf6', flex: 1 },
  buttonStop: { backgroundColor: '#ef4444', flex: 1 },
  buttonSecondary: { backgroundColor: '#e2e8f0', paddingHorizontal: 10 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  statusText: { fontSize: 12, color: '#0f172a', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginTop: 16 },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 16,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: { color: '#0f172a', fontWeight: '600', fontSize: 14, textAlign: 'center' },
});
