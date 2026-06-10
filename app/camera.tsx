import { useMemo, useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraType, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';

import usePostureStore from '@/stores/posture';

export default function CameraModule() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();

  const {
    isAnalyzing,
    currentExercise,
    latestAlert,
    setAnalyzing,
    setExercise,
    pushAlert,
    clearAlert,
  } = usePostureStore();

  const postureStatus = useMemo(() => {
    if (!isAnalyzing) {
      return 'Analisis detenido';
    }

    if (!latestAlert) {
      return 'Postura estable';
    }

    return `Correccion: ${latestAlert.bodyPart}`;
  }, [isAnalyzing, latestAlert]);

  // MediaPipe pose state (skeleton): se inicializa cuando se activa el analisis.
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [poseError, setPoseError] = useState<string | null>(null);
  const poseRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const initPose = async () => {
      try {
        // Intento de import dinámico. En dispositivos móviles puede requerir otro enfoque.
        const mp = await import('@mediapipe/pose');
        if (!mounted) return;
        poseRef.current = mp;
        setMediapipeReady(true);
      } catch (err: any) {
        if (!mounted) return;
        setPoseError('No se pudo cargar MediaPipe Pose. Comprueba dependencias.');
      }
    };

    if (isAnalyzing && !poseRef.current) {
      void initPose();
    }

    return () => {
      mounted = false;
    };
  }, [isAnalyzing]);

  // Simple analysis of landmarks received from WebView (MediaPipe)
  // Thresholds (ajustables)
  const HEELS_ALIGN_THRESHOLD = 0.10; // tolerancia X entre caderas y talones
  const SPINE_STRAIGHTNESS_THRESHOLD = 0.12; // diferencia Y mínima hombros-caderas para considerar postura erguida
  const ABDOMINAL_DY_THRESHOLD = 0.20; // distancia Y mínima hombros-caderas para abdominales

  const analyzeLandmarks = (landmarks: any[]) => {
    if (!isAnalyzing || !landmarks || landmarks.length === 0) return;

    // landmarks are normalized [0..1] with indices per MediaPipe pose
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (!leftHip || !leftAnkle || !rightHip || !rightAnkle) return;

    const hipsX = ((leftHip.x ?? 0) + (rightHip.x ?? 0)) / 2;
    const anklesX = ((leftAnkle.x ?? 0) + (rightAnkle.x ?? 0)) / 2;
    const shouldersY = ((leftShoulder?.y ?? 0) + (rightShoulder?.y ?? 0)) / 2;
    const hipsY = ((leftHip?.y ?? 0) + (rightHip?.y ?? 0)) / 2;

    // Sentadilla: si los talones no están alineados verticalmente con las caderas
    if (currentExercise === 'Sentadilla') {
      const dx = Math.abs(hipsX - anklesX);
      if (dx > HEELS_ALIGN_THRESHOLD) {
        pushAlert({ bodyPart: 'Talones', message: 'Alinea tus talones con la cintura.', severity: 'medium' });
        return;
      }

      // espalda muy inclinada: si la distancia vertical entre hombros y caderas es pequeña
      if (Math.abs(shouldersY - hipsY) < SPINE_STRAIGHTNESS_THRESHOLD) {
        pushAlert({ bodyPart: 'Espalda', message: 'Endereza tu espalda.', severity: 'high' });
        return;
      }

      clearAlert();
    }

    // Abdominales: comprobar si hay contracción (approx: hombros se acercan a caderas en Y)
    if (currentExercise === 'Abdominales') {
      const dy = hipsY - shouldersY; // positive when shoulders above hips
      if (dy < ABDOMINAL_DY_THRESHOLD) {
        pushAlert({ bodyPart: 'Core', message: 'Activa tu core y mantén la espalda baja pegada.', severity: 'medium' });
        return;
      }

      clearAlert();
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.infoText}>Comprobando permisos de camara...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="videocam-off" size={48} color="#64748b" />
        <Text style={styles.title}>Permiso de camara requerido</Text>
        <Text style={styles.infoText}>Este modulo necesita la camara para analisis en vivo de postura.</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
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
        <Text style={styles.headerTitle}>Modulo Camara</Text>
      </View>

      <View style={styles.cameraWrapper}>
        {/* WebView that runs MediaPipe Pose in-page and posts landmarks to React Native */}
        <WebView
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState={true}
          source={{ html: `
            <!doctype html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>html,body{margin:0;padding:0;background:#000}video{width:100%;height:100%;object-fit:cover}</style>
            </head>
            <body>
              <video id="video" autoplay playsinline></video>
              <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.min.js"></script>
              <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.min.js"></script>
              <script>
                const video = document.getElementById('video');
                const FACING = '${facing === 'back' ? 'environment' : 'user'}';
                async function init(){
                  try{
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: FACING }, audio: false });
                    video.srcObject = stream;

                    const pose = new Pose.Pose({locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/' + file});
                    pose.setOptions({modelComplexity: 0, smoothLandmarks: true, enableSegmentation: false});
                    pose.onResults((results) => {
                      if (results && results.poseLandmarks){
                        window.ReactNativeWebView.postMessage(JSON.stringify(results.poseLandmarks));
                      }
                    });

                    const camera = new CameraUtils.Camera(video, { onFrame: async () => { await pose.send({image: video}); }, width: 640, height: 480 });
                    camera.start();
                  } catch(e){
                    window.ReactNativeWebView.postMessage(JSON.stringify({__error: String(e)}));
                  }
                }
                init();
              </script>
            </body>
            </html>
          `}}
          style={styles.webview}
          onMessage={(e) => {
            try {
              const payload = JSON.parse(e.nativeEvent.data);
              if (payload && payload.__error) {
                setPoseError(String(payload.__error));
                return;
              }
              analyzeLandmarks(payload);
            } catch (err) {
              // ignore parse errors
            }
          }}
        />

          {poseError ? (
            <View style={[styles.statusChip, {position: 'absolute', top: 80, left: 16, right: 16}] }>
              <Text style={[styles.statusChipText]}>Error cámara: {poseError}</Text>
            </View>
          ) : null}

        <View style={styles.overlayTop}>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{postureStatus}</Text>
          </View>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
          >
            <Ionicons name="camera-reverse" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.overlayBottom}>
          <View style={styles.exerciseRow}>
            {['Sentadilla', 'Abdominales'].map((exercise) => (
              <TouchableOpacity
                key={exercise}
                style={[styles.exerciseChip, currentExercise === exercise && styles.exerciseChipActive]}
                onPress={() => setExercise(exercise)}
              >
                <Text style={[styles.exerciseChipText, currentExercise === exercise && styles.exerciseChipTextActive]}>
                  {exercise}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlButton, isAnalyzing ? styles.stopButton : styles.startButton]}
              onPress={() => setAnalyzing(!isAnalyzing)}
            >
              <Text style={styles.controlButtonText}>{isAnalyzing ? 'Detener analisis' : 'Iniciar analisis'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.warnButton}
              onPress={() =>
                pushAlert({
                  bodyPart: 'Rodillas',
                  message: 'Alinea rodillas con talones.',
                  severity: 'medium',
                })
              }
            >
              <Ionicons name="alert-circle" size={18} color="#fff" />
              <Text style={styles.controlButtonText}>Simular alerta</Text>
            </TouchableOpacity>
          </View>

          {latestAlert ? (
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>Correccion detectada</Text>
              <Text style={styles.alertText}>{latestAlert.bodyPart}: {latestAlert.message}</Text>
              <TouchableOpacity onPress={clearAlert}>
                <Text style={styles.clearAlertText}>Limpiar alerta</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 22,
    color: '#0f172a',
    fontFamily: 'RobotoBold',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Roboto',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'RobotoBold',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontFamily: 'RobotoBold',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: '#0f172a',
    fontFamily: 'RobotoBold',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: 'RobotoBold',
  },
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlayTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusChipText: {
    color: '#e2e8f0',
    fontFamily: 'RobotoBold',
    fontSize: 12,
  },
  flipButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    gap: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exerciseChipActive: {
    backgroundColor: '#2563eb',
  },
  exerciseChipText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  exerciseChipTextActive: {
    color: '#fff',
    fontFamily: 'RobotoBold',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  startButton: {
    backgroundColor: '#15803d',
  },
  stopButton: {
    backgroundColor: '#b91c1c',
  },
  warnButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1d4ed8',
  },
  controlButtonText: {
    color: '#fff',
    fontFamily: 'RobotoBold',
    fontSize: 13,
  },
  alertCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  alertTitle: {
    color: '#fde68a',
    fontFamily: 'RobotoBold',
    fontSize: 13,
  },
  alertText: {
    color: '#f8fafc',
    fontFamily: 'Roboto',
    fontSize: 13,
    lineHeight: 18,
  },
  clearAlertText: {
    color: '#93c5fd',
    fontFamily: 'RobotoBold',
    fontSize: 12,
  },
});
