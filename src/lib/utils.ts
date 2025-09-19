import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a consistent, visually distinct pastel color from a string.
 * Uses the golden angle to ensure generated colors are far apart in the color space.
 * @param str The input string (e.g., team name, event name).
 * @returns An object with `bgColor` and `textColor`.
 */
export function generateColorFromString(str: string): { bgColor: string; textColor: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Ensure hash is a 32bit integer
  }

  // Use the golden angle approximation to generate distinct hues
  const goldenAngle = 137.5;
  const h = (hash * goldenAngle) % 360;

  // Use a consistent saturation and lightness for a pastel look
  const s = 70; // Saturation
  const l = 88; // Lightness

  const bgColor = `hsl(${h}, ${s}%, ${l}%)`;
  
  // For this light pastel range, a darker, less saturated text color is better for contrast.
  const textColor = `hsl(${h}, 50%, 25%)`;

  return { bgColor, textColor };
}
