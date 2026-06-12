import { PoseKeypointName, PosePoint, PoseTemplate } from './poseTemplates';

export type NormalizedPose = Partial<Record<PoseKeypointName, PosePoint>>;

type PoseAlertSeverity = 'low' | 'medium' | 'high';

export type PoseAlert = {
  bodyPart: string;
  message: string;
  severity: PoseAlertSeverity;
};

export const poseKeypointMap: Record<string, PoseKeypointName> = {
  nose: 'nose',
  left_eye: 'leftEye',
  right_eye: 'rightEye',
  left_ear: 'leftEar',
  right_ear: 'rightEar',
  left_shoulder: 'leftShoulder',
  right_shoulder: 'rightShoulder',
  left_elbow: 'leftElbow',
  right_elbow: 'rightElbow',
  left_wrist: 'leftWrist',
  right_wrist: 'rightWrist',
  left_hip: 'leftHip',
  right_hip: 'rightHip',
  left_knee: 'leftKnee',
  right_knee: 'rightKnee',
  left_ankle: 'leftAnkle',
  right_ankle: 'rightAnkle',
};

export function normalizePoseResult(result: any): NormalizedPose {
  const normalized: NormalizedPose = {};

  const points = result?.keypoints ?? [];
  points.forEach((point: any) => {
    const name = poseKeypointMap[point.name ?? point.part];
    if (!name || point.x == null || point.y == null) return;
    normalized[name] = { x: point.x, y: point.y };
  });

  return normalized;
}

export function distance(a: PosePoint, b: PosePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function calculateAngle(a: PosePoint, b: PosePoint, c: PosePoint): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB === 0 || magCB === 0) return 0;
  const cosAngle = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function getSideAngle(pose: NormalizedPose, start: PoseKeypointName, middle: PoseKeypointName, end: PoseKeypointName): number | null {
  const a = pose[start];
  const b = pose[middle];
  const c = pose[end];
  if (!a || !b || !c) return null;
  return calculateAngle(a, b, c);
}

export function getKneeAngle(pose: NormalizedPose): number | null {
  const left = getSideAngle(pose, 'leftHip', 'leftKnee', 'leftAnkle');
  const right = getSideAngle(pose, 'rightHip', 'rightKnee', 'rightAnkle');
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

export function getHipAngle(pose: NormalizedPose): number | null {
  const left = getSideAngle(pose, 'leftShoulder', 'leftHip', 'leftKnee');
  const right = getSideAngle(pose, 'rightShoulder', 'rightHip', 'rightKnee');
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

export function getTorsoAngle(pose: NormalizedPose): number | null {
  const left = getSideAngle(pose, 'leftShoulder', 'leftHip', 'leftKnee');
  const right = getSideAngle(pose, 'rightShoulder', 'rightHip', 'rightKnee');
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

export function getNeckAngle(pose: NormalizedPose): number | null {
  const leftShoulder = pose.leftShoulder;
  const rightShoulder = pose.rightShoulder;
  const nose = pose.nose;
  if (!leftShoulder || !rightShoulder || !nose) return null;
  return calculateAngle(leftShoulder, nose, rightShoulder);
}

export function getKneeToFootAlignment(pose: NormalizedPose): number | null {
  const left = pose.leftKnee && pose.leftAnkle ? Math.abs(pose.leftKnee.x - pose.leftAnkle.x) : null;
  const right = pose.rightKnee && pose.rightAnkle ? Math.abs(pose.rightKnee.x - pose.rightAnkle.x) : null;
  if (left != null && right != null) return (left + right) / 2;
  return left ?? right;
}

function severityForDifference(diff: number, threshold: PoseThreshold): PoseAlertSeverity {
  const range = threshold.max - threshold.min;
  if (range === 0) return 'high';
  if (diff > range * 0.25) return 'high';
  if (diff > range * 0.15) return 'medium';
  return 'low';
}

function checkThreshold(value: number | null, threshold: PoseThreshold, bodyPart: string): PoseAlert | null {
  if (value == null) {
    return {
      bodyPart,
      message: `No se detectó el punto necesario para medir ${threshold.label}.`,
      severity: 'high',
    };
  }

  if (value < threshold.min) {
    const diff = threshold.min - value;
    return {
      bodyPart,
      message: `${threshold.label} muy bajo: ${value.toFixed(1)}°. Debería ser al menos ${threshold.min}°.`,
      severity: severityForDifference(diff, threshold),
    };
  }

  if (value > threshold.max) {
    const diff = value - threshold.max;
    return {
      bodyPart,
      message: `${threshold.label} muy alto: ${value.toFixed(1)}°. Debería ser menor a ${threshold.max}°.`,
      severity: severityForDifference(diff, threshold),
    };
  }

  return null;
}

export function getPoseAlerts(pose: NormalizedPose, template: PoseTemplate): PoseAlert[] {
  const alerts: PoseAlert[] = [];
  alerts.push(checkThreshold(getKneeAngle(pose), template.thresholds.kneeAngle, 'Rodillas'));
  alerts.push(checkThreshold(getHipAngle(pose), template.thresholds.hipAngle, 'Cadera'));
  alerts.push(checkThreshold(getTorsoAngle(pose), template.thresholds.torsoAngle, 'Torso'));
  alerts.push(checkThreshold(getKneeToFootAlignment(pose), template.thresholds.kneeToFootAlignment, 'Alineación rodilla-pie'));

  if (template.thresholds.neckAngle) {
    alerts.push(checkThreshold(getNeckAngle(pose), template.thresholds.neckAngle, 'Cuello'));
  }

  return alerts.filter(Boolean) as PoseAlert[];
}
