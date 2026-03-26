/**
 * Pre-generated animation library.
 *
 * Maps math concepts to pre-rendered animation URLs.
 * In the MVP, this is a static catalog. Animations are generated locally
 * using Manim and uploaded to blob storage.
 *
 * To add new animations:
 * 1. Create a Manim scene in scripts/manim-scenes/
 * 2. Render locally: `manim -ql scene.py SceneName`
 * 3. Upload to storage and add the URL here
 */

export interface AnimationEntry {
  id: string;
  url: string;
  title: string;
  description: string;
  concepts: string[];
  phase: string[]; // Which phases this animation is appropriate for
}

// Animation catalog — to be populated as animations are created
export const ANIMATION_LIBRARY: AnimationEntry[] = [
  // Example entries (uncomment and set URLs when animations are ready):
  // {
  //   id: "fraction-addition",
  //   url: "/animations/fraction-addition.mp4",
  //   title: "Adding Fractions Visually",
  //   description: "Shows how to find common denominators and add fractions using area models",
  //   concepts: ["fractions", "addition", "common denominator", "LCD"],
  //   phase: ["PHASE_0", "PHASE_1"],
  // },
  // {
  //   id: "number-line-basics",
  //   url: "/animations/number-line.mp4",
  //   title: "The Number Line",
  //   description: "Introduces positive and negative numbers on a number line with animated jumps",
  //   concepts: ["number line", "integers", "negative numbers", "addition", "subtraction"],
  //   phase: ["PHASE_0", "PHASE_1"],
  // },
  // {
  //   id: "quadratic-graph",
  //   url: "/animations/quadratic-graph.mp4",
  //   title: "Quadratic Functions",
  //   description: "Shows how changing a, b, c in ax² + bx + c transforms the parabola",
  //   concepts: ["quadratic", "parabola", "graph transformation", "vertex"],
  //   phase: ["PHASE_2", "PHASE_3"],
  // },
];

/**
 * Find the best matching animation for a given concept.
 * Returns null if no suitable animation exists.
 */
export function findAnimation(
  concept: string,
  phase?: string
): AnimationEntry | null {
  const query = concept.toLowerCase();
  const words = query.split(/\s+/);

  let bestMatch: AnimationEntry | null = null;
  let bestScore = 0;

  for (const entry of ANIMATION_LIBRARY) {
    // Skip if phase doesn't match
    if (phase && !entry.phase.includes(phase)) continue;

    // Score based on concept overlap
    let score = 0;
    for (const word of words) {
      for (const entryConcept of entry.concepts) {
        if (entryConcept.toLowerCase().includes(word)) {
          score += 1;
        }
      }
      if (entry.title.toLowerCase().includes(word)) score += 0.5;
      if (entry.description.toLowerCase().includes(word)) score += 0.25;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  // Require at least one concept match
  return bestScore >= 1 ? bestMatch : null;
}
