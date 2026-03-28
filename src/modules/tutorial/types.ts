export type TutorialBlock =
  | { type: "text"; content: string }
  | { type: "latex"; content: string }
  | { type: "p5"; code: string; height?: number };

export interface TutorialData {
  blocks: TutorialBlock[];
}
