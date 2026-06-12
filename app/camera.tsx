import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { router } from 'expo-router';
import usePostureStore from '@/stores/posture';
import { initPoseDetectorAsync, estimatePoseFromCameraAsync } from '@/lib/poseDetector';
import { analyzeSquatFrame, createInitialSquatState, SquatState } from '@/lib/squatDetector';
import { analyzeCrunchFrame, createInitialCrunchState, CrunchState } from '@/lib/crunchDetector';
import SquatFeedback, { ExerciseFeedbackState } from '@/components/SquatFeedback';
import PoseOverlay from '@/components/PoseOverlay';

type ContainerSize = { width: number; height: number };

export default function CameraModule() {
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<any>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });
  const [activeKeypoints, setActiveKeypoints] = useState<any[]>([]);

  // Per-exercise states
  const [squatState, setSquatState] = useState<SquatState>(createInitialSquatState());
  const [crunchState, setCrunchState] = useState<CrunchState>(createInitialCrunchState());
  const squatStateRef  = useRef<SquatState>(createInitialSquatState());
  const crunchStateRef = useRef<CrunchState>(createInitialCrunchState());

  const { isAnalyzing, currentExercise, setAnalyzing, setExercise } = usePostureStore();

  const isSquat  = currentExercise === 'Sentadilla';
  const isCrunch = currentExercise === 'Abdominales';

  // Keep refs in sync with state for closure-safe interval access
  useEffect(() => { squatStateRef.current  = squatState;  }, [squatState]);
  useEffect(() => { crunchStateRef.current = crunchState; }, [crunchState]);

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
    (async () => {
      try {
        await initPoseDetectorAsync();
        setDetectorReady(true);
      } catch (e) {
        console.warn('Error inicializando detector de pose', e);
      }
    })();
  }, []);

  const analyzeCurrentFrame = async () => {
    if (!detectorReady || !cameraRef.current) return;
    try {
      const pose = await estimatePoseFromCameraAsync(cameraRef);
      if (!pose?.keypoints) return;

      setActiveKeypoints(pose.keypoints);

      if (isSquat) {
        const next = analyzeSquatFrame(pose.keypoints, squatStateRef.current);
        squatStateRef.current = next;
        setSquatState(next);
      } else if (isCrunch) {
        const next = analyzeCrunchFrame(pose.keypoints, crunchStateRef.current);
        crunchStateRef.current = next;
        setCrunchState(next);
      }
    } catch (e) {
      console.warn('Error analizando frame', e);
    }
  };

  useEffect(() => {
    if (!isAnalyzing || !detectorReady) return;
    analyzeCurrentFrame();
    const interval = setInterval(analyzeCurrentFrame, 500);
    return () => clearInterval(interval);
  }, [isAnalyzing, detectorReady, currentExercise]);

  const selectExercise = (exercise: string) => {
    // Reset the state of the selected exercise
    if (exercise === 'Sentadilla') {
      const s = createInitialSquatState();
      setSquatState(s);
      squatStateRef.current = s;
    } else if (exercise === 'Abdominales') {
      const s = createInitialCrunchState();
      setCrunchState(s);
      crunchStateRef.current = s;
    }
    setActiveKeypoints([]);
    setExercise(exercise);
    setAnalyzing(true);
  };

  const stopAnalysis = () => {
    setAnalyzing(false);
    setActiveKeypoints([]);
  };

  const handleCameraLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  // Build a unified feedback state for the SquatFeedback component
  const feedbackState: ExerciseFeedbackState | null = (() => {
    if (isSquat) return {
      repCount: squatState.repCount,
      phase: squatState.phase,
      issues: squatState.issues,
      badPosture: squatState.badPosture,
      lastRepCounted: squatState.lastRepCounted,
      hadBadPostureDuringRep: squatState.hadBadPostureDuringRep,
      lowVisibility: squatState.lowVisibility,
      primaryAngle: squatState.kneeAngle,
    };
    if (isCrunch) return {
      repCount: crunchState.repCount,
      phase: crunchState.phase,
      issues: crunchState.issues,
      badPosture: crunchState.badPosture,
      lastRepCounted: crunchState.lastRepCounted,
      hadBadPostureDuringRep: crunchState.hadBadPostureDuringRep,
      lowVisibility: crunchState.lowVisibility,
      primaryAngle: crunchState.trunkAngle,
    };
    return null;
  })();

  const activeSide = isSquat
    ? squatState.activeSide
    : isCrunch
    ? crunchState.activeSide
    : null;

  const badPosture = isSquat
    ? squatState.badPosture
    : isCrunch
    ? crunchState.badPosture
    : false;

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

      <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

        {/* Skeleton + keypoint overlay — shown for both exercises */}
        {isAnalyzing && activeKeypoints.length > 0 && (
          <PoseOverlay
            keypoints={activeKeypoints}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            badPosture={badPosture}
            activeSide={activeSide}
          />
        )}

        {/* Rep counter + posture feedback */}
        {isAnalyzing && feedbackState && (
          <SquatFeedback
            state={feedbackState}
            angleName={isSquat ? 'Rodilla' : 'Tronco'}
            phaseLabels={
              isSquat
                ? { up: '▲ ARRIBA', down: '▼ ABAJO' }
                : { up: '▲ SUBIENDO', down: '▼ BAJANDO' }
            }
          />
        )}
      </View>

      {/* Exercise buttons */}
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
          <View style={[styles.statusDot, !detectorReady && styles.statusDotWaiting]} />
          <Text style={styles.statusText}>
            {detectorReady
              ? `Analizando ${currentExercise.toLowerCase()} en vivo`
              : 'Iniciando detector de postura...'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  cameraContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  camera: { flex: 1 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, justifyContent: 'center' },
  buttonSentadilla: { backgroundColor: '#3b82f6', flex: 1 },
  buttonAbdominales: { backgroundColor: '#8b5cf6', flex: 1 },
  buttonStop: { backgroundColor: '#ef4444', flex: 1 },
  buttonSecondary: { backgroundColor: '#e2e8f0', paddingHorizontal: 10 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f1f5f9', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  statusDotWaiting: { backgroundColor: '#f59e0b' },
  statusText: { fontSize: 12, color: '#0f172a', fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginTop: 16 },
  infoText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, marginHorizontal: 16 },
  primaryButton: { marginTop: 24, backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  secondaryButton: { marginTop: 12, backgroundColor: '#e2e8f0', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  secondaryButtonText: { color: '#0f172a', fontWeight: '600', fontSize: 14, textAlign: 'center' },
});
