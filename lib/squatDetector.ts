// Indices MoveNet 17-point: 0=nose, 3=leftEar, 4=rightEar,
// 5=leftShoulder, 6=rightShoulder, 11=leftHip, 12=rightHip,
// 13=leftKnee, 14=rightKnee, 15=leftAnkle, 16=rightAnkle

type Kp = { x: number; y: number; score?: number };

const RIGHT = { ear: 4, shoulder: 6, hip: 12, knee: 14, ankle: 16 };
const LEFT  = { ear: 3, shoulder: 5, hip: 11, knee: 13, ankle: 15 };

export type SquatIssue = { label: string; message: string };

export type SquatState = {
  repCount: number;
  isUp: boolean;
  isDown: boolean;
  hadBadPostureDuringRep: boolean;
  issues: SquatIssue[];
  kneeAngle: number | null;
  torsoAngle: number | null;
  phase: 'up' | 'down' | 'idle';
  badPosture: boolean;
  activeSide: 'left' | 'right' | null;
  lowVisibility: boolean;
  lastRepCounted: boolean;
};

export function createInitialSquatState(): SquatState {
  return {
    repCount: 0,
    isUp: false,
    isDown: false,
    hadBadPostureDuringRep: false,
    issues: [],
    kneeAngle: null,
    torsoAngle: null,
    phase: 'idle',
    badPosture: false,
    activeSide: null,
    lowVisibility: false,
    lastRepCounted: false,
  };
}

function avgScore(kps: Kp[], indices: number[]): number {
  return indices.reduce((s, i) => s + (kps[i]?.score ?? 0), 0) / indices.length;
}

function pickSide(kps: Kp[]): { side: typeof RIGHT; label: 'right' | 'left' } {
  const visR = avgScore(kps, [RIGHT.shoulder, RIGHT.hip, RIGHT.knee, RIGHT.ankle]);
  const visL = avgScore(kps, [LEFT.shoulder,  LEFT.hip,  LEFT.knee,  LEFT.ankle]);
  return visR >= visL
    ? { side: RIGHT, label: 'right' }
    : { side: LEFT,  label: 'left' };
}

// Angle at p2 (vertex) between segments p1-p2 and p3-p2
function calcAngle(p1: Kp, p2: Kp, p3: Kp): number {
  const a = Math.hypot(p2.x - p3.x, p2.y - p3.y);
  const c = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const b = Math.hypot(p1.x - p3.x, p1.y - p3.y);
  if (a === 0 || c === 0) return 0;
  const cos = (a * a + c * c - b * b) / (2 * a * c + 1e-6);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

// Angle between vector (dx, dy) and upward vertical (0, -1) in image coords
function angleWithVertical(dx: number, dy: number): number {
  const len = Math.hypot(dx, dy);
  if (len === 0) return 0;
  const cos = -dy / len;
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

export function analyzeSquatFrame(rawKeypoints: Kp[], prevState: SquatState): SquatState {
  if (!rawKeypoints || rawKeypoints.length < 17) {
    return { ...prevState, lowVisibility: true, issues: [], badPosture: false, lastRepCounted: false };
  }

  const { side, label: activeSide } = pickSide(rawKeypoints);
  const vis = avgScore(rawKeypoints, [side.shoulder, side.hip, side.knee, side.ankle]);

  if (vis < 0.3) {
    return { ...prevState, lowVisibility: true, issues: [], badPosture: false, activeSide: null, lastRepCounted: false };
  }

  const shoulder = rawKeypoints[side.shoulder];
  const hip      = rawKeypoints[side.hip];
  const knee     = rawKeypoints[side.knee];
  const ankle    = rawKeypoints[side.ankle];
  const ear      = rawKeypoints[side.ear];

  if (!shoulder || !hip || !knee || !ankle) {
    return { ...prevState, lowVisibility: true, issues: [], badPosture: false, lastRepCounted: false };
  }

  const kneeAngle  = calcAngle(hip, knee, ankle);
  const torsoAngle = angleWithVertical(shoulder.x - hip.x, shoulder.y - hip.y);

  let { isUp, isDown, hadBadPostureDuringRep, repCount } = prevState;
  let lastRepCounted = false;

  // State machine: standing → squat → standing = 1 rep
  if (kneeAngle >= 160) {
    isUp = true;
    if (isDown) {
      // Completed a full rep — only count if no posture errors during descent
      if (!hadBadPostureDuringRep) {
        repCount += 1;
        lastRepCounted = true;
      }
      isDown = false;
      hadBadPostureDuringRep = false;
    }
  }
  if (isUp && kneeAngle <= 70) {
    isDown = true;
  }

  const phase: SquatState['phase'] = isDown ? 'down' : (isUp ? 'up' : 'idle');

  // Posture checks — only during the squat itself (knee < 130°)
  const issues: SquatIssue[] = [];
  if (kneeAngle < 130) {
    // 1. Head forward: ear-shoulder vector vs vertical
    if (ear) {
      const neckAngle = angleWithVertical(ear.x - shoulder.x, ear.y - shoulder.y);
      if (neckAngle > 22) {
        issues.push({ label: '! Cabeza adelantada', message: 'Mantén la cabeza erguida' });
      }
    }
    // 2. Torso too inclined forward
    if (torsoAngle > 40) {
      issues.push({ label: '! Torso muy inclinado', message: 'Inclina menos el torso' });
    }
    // 3. Knee too far forward relative to ankle
    const legLen = Math.hypot(hip.x - ankle.x, hip.y - ankle.y) + 1e-6;
    if (Math.abs(knee.x - ankle.x) / legLen > 0.28) {
      issues.push({ label: '! Rodilla adelantada', message: 'Cuida las rodillas' });
    }
  }

  if (issues.length > 0) hadBadPostureDuringRep = true;

  return {
    repCount,
    isUp,
    isDown,
    hadBadPostureDuringRep,
    issues,
    kneeAngle,
    torsoAngle,
    phase,
    badPosture: issues.length > 0,
    activeSide,
    lowVisibility: false,
    lastRepCounted,
  };
}
