import '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';

let detector: poseDetection.PoseDetector | null = null;

export async function initPoseDetectorAsync(): Promise<void> {
  if (!detector) {
    await tf.ready();
    await tf.setBackend('rn-webgl');
    await tf.ready();

    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });
  }
}

export async function estimatePoseFromCameraAsync(cameraRef: any): Promise<any | null> {
  if (!detector) {
    throw new Error('Pose detector no inicializado. Llama a initPoseDetectorAsync() primero.');
  }

  const camera = cameraRef.current;
  try {
    console.log('[poseDetector] cameraRef current keys=', camera ? Object.keys(camera) : null);
    if (!camera) {
      console.warn('[poseDetector] camera ref vacío');
      return null;
    }

    const method = camera.takePictureAsync ?? camera.takePicture;
    if (typeof method !== 'function') {
      console.warn('[poseDetector] no se encontró método de captura en cameraRef');
      return null;
    }

    const photo = await method.call(camera, { base64: false, quality: 0.5, skipProcessing: true });
  if (!photo?.uri) return null;

    console.log('[poseDetector] photo uri=', photo.uri);
    const response = await fetch(photo.uri);
    const arrayBuffer = await response.arrayBuffer();
    const imageTensor = decodeJpeg(new Uint8Array(arrayBuffer));

  try {
    const shape = imageTensor.shape as number[];
    const imgH = shape[0];
    const imgW = shape[1];
    const poses = await detector.estimatePoses(imageTensor, { flipHorizontal: false });
    const pose = poses?.[0];
    if (!pose) return null;
    // Normalize keypoints to [0,1] so overlay can map to any display size
    const normalizedKeypoints = pose.keypoints.map((kp: any) => ({
      ...kp,
      x: kp.x / imgW,
      y: kp.y / imgH,
    }));
    return { ...pose, keypoints: normalizedKeypoints };
  } finally {
    imageTensor.dispose();
  }
  } catch (e) {
    console.error('[poseDetector] error durante estimación:', e);
    return null;
  }
}
