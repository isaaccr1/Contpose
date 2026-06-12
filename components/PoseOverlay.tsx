import { View } from 'react-native';

type Kp = { x: number; y: number; score?: number };

const SIDE_CONNECTIONS: Record<'left' | 'right', [number, number][]> = {
  right: [[4, 6], [6, 12], [12, 14], [14, 16]],
  left:  [[3, 5], [5, 11], [11, 13], [13, 15]],
};
const SIDE_POINTS: Record<'left' | 'right', number[]> = {
  right: [4, 6, 12, 14, 16],
  left:  [3, 5, 11, 13, 15],
};

const POINT_COLORS: Record<number, string> = {
  3: '#e0f2fe', 4: '#e0f2fe',   // ears — light blue
  5: '#fde68a', 6: '#fde68a',   // shoulders — yellow
  11: '#fb923c', 12: '#fb923c', // hips — orange
  13: '#a78bfa', 14: '#a78bfa', // knees — purple
  15: '#6ee7b7', 16: '#6ee7b7', // ankles — green
};

interface Props {
  keypoints: Kp[];
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
  badPosture: boolean;
  activeSide: 'left' | 'right' | null;
  facing?: 'front' | 'back';
}

/**
 * Maps a normalized keypoint [0,1] to display coordinates inside the container,
 * accounting for the "cover" crop that CameraView applies when the camera image
 * has a different aspect ratio than the container.
 *
 * With skipProcessing removed, iOS returns correctly oriented images, so:
 *   - Portrait phone → portrait image (H > W)
 *   - Camera image AR may differ from container AR → cover crop applies
 */
function coverMap(
  nx: number, ny: number,
  imgW: number, imgH: number,
  contW: number, contH: number,
  mirrorX = false,
): { x: number; y: number } {
  if (imgW === 0 || imgH === 0 || contW === 0 || contH === 0) {
    return { x: nx * contW, y: ny * contH };
  }

  const imgAR  = imgW / imgH;
  const contAR = contW / contH;

  let x: number;
  let y: number;

  if (imgAR > contAR) {
    // Image is wider than container → scaled to fit height, width cropped
    const scale   = contH / imgH;
    const xOffset = (imgW * scale - contW) / 2;
    x = nx * imgW * scale - xOffset;
    y = ny * contH;
  } else {
    // Image is taller than container → scaled to fit width, height cropped
    const scale   = contW / imgW;
    const yOffset = (imgH * scale - contH) / 2;
    x = nx * contW;
    y = ny * imgH * scale - yOffset;
  }

  if (mirrorX) x = contW - x;
  return { x, y };
}

interface LineProps { x1: number; y1: number; x2: number; y2: number; color: string }
function SkeletonLine({ x1, y1, x2, y2, color }: LineProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const midX  = (x1 + x2) / 2;
  const midY  = (y1 + y2) / 2;
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

export default function PoseOverlay({
  keypoints, containerWidth, containerHeight,
  imageWidth, imageHeight,
  badPosture, activeSide, facing = 'back',
}: Props) {
  if (
    !keypoints || keypoints.length < 17 || !activeSide ||
    containerWidth === 0 || containerHeight === 0
  ) return null;

  const lineColor  = badPosture ? '#ef4444' : '#22c55e';
  const connections = SIDE_CONNECTIONS[activeSide];
  const pointIds    = SIDE_POINTS[activeSide];
  const MIN_SCORE   = 0.45;
  const mirrorX     = facing === 'front';

  const map = (kp: Kp) =>
    coverMap(kp.x, kp.y, imageWidth, imageHeight, containerWidth, containerHeight, mirrorX);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, width: containerWidth, height: containerHeight }}
      pointerEvents="none"
    >
      {connections.map(([i, j]) => {
        const a = keypoints[i];
        const b = keypoints[j];
        if (!a || !b || (a.score ?? 0) < MIN_SCORE || (b.score ?? 0) < MIN_SCORE) return null;
        const { x: x1, y: y1 } = map(a);
        const { x: x2, y: y2 } = map(b);
        return <SkeletonLine key={`${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} color={lineColor} />;
      })}

      {pointIds.map((i) => {
        const kp = keypoints[i];
        if (!kp || (kp.score ?? 0) < MIN_SCORE) return null;
        const { x: sx, y: sy } = map(kp);
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
