// Abdominal crunch detector
//
// Professional reference angles (biomechanics / physiotherapy consensus):
//   - Trunk elevation for valid rep:  ≥ 28° from horizontal
//     (Studies: McGill 2001, Escamilla et al. 2006 — enough rectus abdominis
//      activation without excessive hip-flexor recruitment)
//   - Trunk "down" position:          ≤ 10° (essentially flat on floor)
//   - Over-crunch / sit-up territory: > 50° (hip flexors dominate, spine risk)
//   - Knee angle (hip-knee-ankle):    75°–110°
//     (90° is optimal; < 75° too compressed, > 110° insufficient stabilisation)
//   - Neck/head deviation from torso: ≤ 30°
//     (Pulling the head forward strains C-spine; hands should rest loosely)
//
// Camera placement: lateral (side) view, same as squats.

type Kp = { x: number; y: number; score?: number };

const RIGHT = { ear: 4, shoulder: 6, hip: 12, knee: 14, ankle: 16 };
const LEFT  = { ear: 3, shoulder: 5, hip: 11, knee: 13, ankle: 15 };

export type CrunchIssue = { label: string; message: string };

export type CrunchState = {
  repCount: number;
  isDown: boolean;       // lying flat  (trunk ≤ 10°)
  isUp: boolean;         // crunched up (trunk ≥ 28°)
  hadBadPostureDuringRep: boolean;
  issues: CrunchIssue[];
  trunkAngle: number | null;  // degrees from horizontal
  kneeAngle: number | null;
  phase: 'up' | 'down' | 'idle';
  badPosture: boolean;
  activeSide: 'left' | 'right' | null;
  lowVisibility: boolean;
  lastRepCounted: boolean;
};

export function createInitialCrunchState(): CrunchState {
  return {
    repCount: 0,
    isDown: false,
    isUp: false,
    hadBadPostureDuringRep: false,
    issues: [],
    trunkAngle: null,
    kneeAngle: null,
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

// Angle at vertex p2 using law of cosines
function calcAngle(p1: Kp, p2: Kp, p3: Kp): number {
  const a = Math.hypot(p2.x - p3.x, p2.y - p3.y);
  const c = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const b = Math.hypot(p1.x - p3.x, p1.y - p3.y);
  if (a === 0 || c === 0) return 0;
  const cos = (a * a + c * c - b * b) / (2 * a * c + 1e-6);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

// Angle between vector (dx,dy) and upward vertical (0,-1) in image coords (y↓)
function angleWithVertical(dx: number, dy: number): number {
  const len = Math.hypot(dx, dy);
  if (len === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, -dy / len))) * 180) / Math.PI;
}

// Trunk elevation from horizontal:
//   flat  → ~0°   (torso horizontal, angleWithVertical ≈ 90°)
//   crunch → ~30-45° (torso rising,  angleWithVertical ≈ 45-60°)
function trunkElevation(shoulder: Kp, hip: Kp): number {
  return 90 - angleWithVertical(shoulder.x - hip.x, shoulder.y - hip.y);
}

export function analyzeCrunchFrame(rawKeypoints: Kp[], prevState: CrunchState): CrunchState {
  if (!rawKeypoints || rawKeypoints.length < 17) {
    return { ...prevState, lowVisibility: true, issues: [], badPosture: false, lastRepCounted: false };
  }

  const { side, label: activeSide } = pickSide(rawKeypoints);
  const vis = avgScore(rawKeypoints, [side.shoulder, side.hip, side.knee, side.ankle]);

  if (vis < 0.5) {
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

  const trunk = trunkElevation(shoulder, hip);
  const kneeAng = calcAngle(hip, knee, ankle);

  let { isDown, isUp, hadBadPostureDuringRep, repCount } = prevState;
  let lastRepCounted = false;

  // State machine: flat → crunched → flat = 1 rep
  if (trunk <= 10) {
    isDown = true;
    if (isUp) {
      // Completed a rep coming back down
      if (!hadBadPostureDuringRep) {
        repCount += 1;
        lastRepCounted = true;
      }
      isUp = false;
      hadBadPostureDuringRep = false;
    }
  }
  if (isDown && trunk >= 28) {
    isUp = true;
  }

  const phase: CrunchState['phase'] = isUp ? 'up' : (isDown ? 'down' : 'idle');

  // Posture checks — only during active phase (trunk > 10°)
  const issues: CrunchIssue[] = [];
  if (trunk > 10) {
    // 1. Knees not properly bent
    if (kneeAng > 115) {
      issues.push({ label: '! Rodillas rectas', message: 'Mantén las rodillas dobladas a 90°' });
    }

    // 2. Over-crunching (sit-up territory — hip flexors take over)
    if (trunk > 50) {
      issues.push({ label: '! Sube demasiado', message: 'No es un sit-up, sube solo el torso' });
    }

    // 3. Neck/head pulled forward
    if (ear) {
      // Neck vector relative to torso: both should point in same upward direction
      const torsoFromVertical = angleWithVertical(shoulder.x - hip.x, shoulder.y - hip.y);
      const neckFromVertical  = angleWithVertical(ear.x - shoulder.x,  ear.y - shoulder.y);
      // If neck is tilted significantly more than the torso toward horizontal
      if (neckFromVertical > torsoFromVertical + 30) {
        issues.push({ label: '! Cuello tenso', message: 'No jales el cuello, mantenlo relajado' });
      }
    }
  }

  if (issues.length > 0) hadBadPostureDuringRep = true;

  return {
    repCount,
    isDown,
    isUp,
    hadBadPostureDuringRep,
    issues,
    trunkAngle: trunk,
    kneeAngle: kneeAng,
    phase,
    badPosture: issues.length > 0,
    activeSide,
    lowVisibility: false,
    lastRepCounted,
  };
}
