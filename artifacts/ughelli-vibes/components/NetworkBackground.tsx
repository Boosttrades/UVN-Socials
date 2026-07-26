/**
 * NetworkBackground
 * Renders an animated network of nodes and edges (like a 3D connectivity graph)
 * using react-native-svg + react-native-reanimated.
 *
 * Usage:
 *   <NetworkBackground color="#0F8A5F" opacity={0.18} nodeCount={28} />
 *
 * The component fills its parent (use position:absolute + full coverage on parent).
 */
import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('window');

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number; // radius
  pulse: number; // phase offset for glow
}

interface Props {
  color?: string;
  opacity?: number;
  nodeCount?: number;
  width?: number;
  height?: number;
  maxDistance?: number; // max px between nodes to draw an edge
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// We use a JS-driven animation loop (requestAnimationFrame-like via setInterval)
// because SVG path data can't be driven by Reanimated shared values directly
// in React Native SVG. The tick rate is 24fps to be gentle on battery.
const TICK_MS = 1000 / 24;

export default function NetworkBackground({
  color = '#0F8A5F',
  opacity = 0.15,
  nodeCount = 22,
  width = SW,
  height = SH,
  maxDistance = 130,
}: Props) {
  const [frame, setFrame] = React.useState(0);
  const nodesRef = useRef<Node[]>([]);

  // Initialise nodes once
  if (nodesRef.current.length === 0) {
    for (let i = 0; i < nodeCount; i++) {
      const speed = 0.18 + Math.random() * 0.22;
      const angle = Math.random() * Math.PI * 2;
      nodesRef.current.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2.5 + Math.random() * 2.5,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  // Animation tick
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t++;
      const nodes = nodesRef.current;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        // bounce off edges
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > width) { n.x = width; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > height) { n.y = height; n.vy *= -1; }
        n.pulse += 0.04;
      }
      setFrame(t);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [width, height]);

  const nodes = nodesRef.current;

  // Build edges
  const edges: { x1: number; y1: number; x2: number; y2: number; alpha: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDistance) {
        // fade out as distance increases
        const alpha = 1 - dist / maxDistance;
        edges.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y, alpha });
      }
    }
  }

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        {/* Edges */}
        {edges.map((e, idx) => (
          <Line
            key={idx}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={color}
            strokeWidth={1}
            strokeOpacity={e.alpha * opacity * 1.8}
          />
        ))}
        {/* Nodes */}
        {nodes.map((n) => {
          const pulseScale = 1 + 0.25 * Math.sin(n.pulse);
          const glowOpacity = (0.5 + 0.5 * Math.sin(n.pulse)) * opacity * 2.5;
          return (
            <React.Fragment key={n.id}>
              {/* glow halo */}
              <Circle
                cx={n.x}
                cy={n.y}
                r={n.r * pulseScale * 3.5}
                fill={color}
                fillOpacity={glowOpacity * 0.25}
              />
              {/* solid core */}
              <Circle
                cx={n.x}
                cy={n.y}
                r={n.r * pulseScale}
                fill={color}
                fillOpacity={opacity * 3}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
