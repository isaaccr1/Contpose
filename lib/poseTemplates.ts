export type PoseKeypointName =
  | 'nose'
  | 'leftEye'
  | 'rightEye'
  | 'leftEar'
  | 'rightEar'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftElbow'
  | 'rightElbow'
  | 'leftWrist'
  | 'rightWrist'
  | 'leftHip'
  | 'rightHip'
  | 'leftKnee'
  | 'rightKnee'
  | 'leftAnkle'
  | 'rightAnkle';

export type PosePoint = {
  x: number;
  y: number;
};

export type PoseKeypoints = Record<PoseKeypointName, PosePoint>;

export type PoseThreshold = {
  min: number;
  max: number;
  label: string;
};

export type PoseTemplate = {
  exercise: string;
  description: string;
  keypoints: Partial<PoseKeypoints>;
  thresholds: {
    kneeAngle: PoseThreshold;
    hipAngle: PoseThreshold;
    torsoAngle: PoseThreshold;
    kneeToFootAlignment: PoseThreshold;
    backAngle?: PoseThreshold;
    neckAngle?: PoseThreshold;
  };
};

const sentadillaTemplate: PoseTemplate = require('../assets/pose-templates/sentadilla.json');
const abdominalesTemplate: PoseTemplate = require('../assets/pose-templates/abdominales.json');

const poseTemplates: Record<string, PoseTemplate> = {
  Sentadilla: sentadillaTemplate,
  Abdominales: abdominalesTemplate,
};

export function getPoseTemplate(exercise: string): PoseTemplate | null {
  return poseTemplates[exercise] ?? null;
}

export function listPoseTemplates(): PoseTemplate[] {
  return Object.values(poseTemplates);
}
