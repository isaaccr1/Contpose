import { View } from 'react-native';

type Kp = { x: number; y: number; score?: number };

// MoveNet indices used for side-view exercises
const SIDE_CONNECTIONS: Record<'left' | 'right', [number, number][]> = {
  right: [[4, 6], [6, 12], [12, 14], [14, 16]],  // ear→shoulder→hip→knee→ankle
  left:  [[3, 5], [5, 11], [11, 13], [13, 15]],
};
const SIDE_POINTS: Record<'left' | 'right', number[]> = {
  right: [4, 6, 12, 14, 16],
  left:  [3, 5, 11, 13, 15],
};

// Dot colors per keypoint role
const POINT_COLORS: Record<number, string> = {
  3: '#e0f2fe',  // left ear  — light blue
  4: '#e0f2fe',  // right ear
  5: '#fde68a',  // left shoulder  — yellow
  6: '#fde68a',  // right shoulder
  11: '#fb923c', // left hip  — orange
  12: '#fb923c', // right hip
  13: '#a78bfa', // left knee  — purple
  14: '#a78bfa', // right knee
  15: '#6ee7b7', // left ankle  — green
  16: '#6ee7b7', // right ankle
};

interface Props {
  keypoints: Kp[];
  containerWidth: number;
  containerHeight: number;
  badPosture: boolean;
  activeSide: 'left' | 'right' | null;
}

function dot(kp: Kp, w: number, h: number): { sx: number; sy: number } {
  return { sx: kp.x * w, sy: kp.y * h };
}

interface LineProps {
  x1: number; y1: number; x2: number; y2: number; color: string;
}
function SkeletonLine({ x1, y1, x2, y2, color }: LineProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <View
      style={{
        position: 'absolute',
        left: midX - length / 2,
        top: midY - 3,
        width: length,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        opacity: 0.85,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export default function PoseOverlay({ keypoints, containerWidth, containerHeight, badPosture, activeSide }: Props) {
  if (!keypoints || keypoints.length < 17 || !activeSide || containerWidth === 0 || containerHeight === 0) {
    return null;
  }

  const lineColor  = badPosture ? '#ef4444' : '#22c55e';
  const connections = SIDE_CONNECTIONS[activeSide];
  const pointIds    = SIDE_POINTS[activeSide];

  const MIN_SCORE = 0.5;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: containerWidth, height: containerHeight }} pointerEvents="none">
      {/* Skeleton lines */}
      {connections.map(([i, j]) => {
        const a = keypoints[i];
        const b = keypoints[j];
        if (!a || !b || (a.score ?? 0) < MIN_SCORE || (b.score ?? 0) < MIN_SCORE) return null;
        const { sx: x1, sy: y1 } = dot(a, containerWidth, containerHeight);
        const { sx: x2, sy: y2 } = dot(b, containerWidth, containerHeight);
        return <SkeletonLine key={`${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} color={lineColor} />;
      })}

      {/* Keypoint dots */}
      {pointIds.map((i) => {
        const kp = keypoints[i];
        if (!kp || (kp.score ?? 0) < MIN_SCORE) return null;
        const { sx, sy } = dot(kp, containerWidth, containerHeight);
        const R = 7;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: sx - R,
              top: sy - R,
              width: R * 2,
              height: R * 2,
              borderRadius: R,
              backgroundColor: POINT_COLORS[i] ?? '#fff',
              borderWidth: 2,
              borderColor: lineColor,
              opacity: 0.95,
            }}
          />
        );
      })}
    </View>
  );
}
