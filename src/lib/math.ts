import type { Point2D } from '../types';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

export const distance = (a: Point2D, b: Point2D): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const averagePoint = (points: Point2D[]): Point2D => {
  if (points.length === 0) {
    return { x: 0.5, y: 0.5 };
  }

  const sum = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
};
