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
  if (!detector) return null;

  const camera = cameraRef?.current;
  if (!camera) return null;

  try {
    const method = camera.takePictureAsync ?? camera.takePicture;
    if (typeof method !== 'function') return null;

    const photo = await method.call(camera, { base64: false, quality: 0.3, skipProcessing: true });
    if (!photo?.uri) return null;

    const response = await fetch(photo.uri);
    const arrayBuffer = await response.arrayBuffer();
    const imageTensor = decodeJpeg(new Uint8Array(arrayBuffer));

    try {
      const shape = imageTensor.shape as number[];
      const imgH = shape[0];
      const imgW = shape[1];

      const poses = await detector.estimatePoses(imageTensor, {
        flipHorizontal: false,
        maxPoses: 1,
        scoreThreshold: 0.3,
      });

      const pose = poses?.[0];
      if (!pose) return null;

      // Reject detections where the overall pose score is too low
      if ((pose.score ?? 0) < 0.2) return null;

      // Normalize keypoints to [0,1] so overlay maps to any display size
      const normalizedKeypoints = pose.keypoints.map((kp: any) => ({
        ...kp,
        x: kp.x / imgW,
        y: kp.y / imgH,
      }));

      return { ...pose, keypoints: normalizedKeypoints };
    } finally {
      imageTensor.dispose();
    }
  } catch (e: any) {
    // Silently ignore expected lifecycle errors (camera unmounting, navigation)
    const msg = e?.message ?? '';
    if (
      msg.includes('unmounted') ||
      msg.includes('Camera is not running') ||
      msg.includes('not running')
    ) {
      return null;
    }
    console.warn('[poseDetector] error durante estimación:', msg);
    return null;
  }
}
