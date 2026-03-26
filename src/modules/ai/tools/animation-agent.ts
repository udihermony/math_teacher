import { askClaude } from "../claude-client";
import { buildAnimationPrompt } from "../prompts/animation-agent";

interface AnimationRequest {
  concept: string;
  description: string;
  targetAge: number;
}

interface AnimationResult {
  code: string;
  sceneName: string;
  description: string;
}

/**
 * Generate Manim Python code for a mathematical animation.
 *
 * This generates the code only — rendering must happen on a machine
 * with Manim installed (local dev or external service like Modal.com).
 */
export async function generateManimCode(
  userId: string,
  request: AnimationRequest
): Promise<AnimationResult> {
  const systemPrompt = buildAnimationPrompt(request.targetAge);

  const response = await askClaude({
    userId,
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Create a Manim animation for: ${request.concept}\n\nDescription: ${request.description}\n\nReturn ONLY the Python code for a single Manim Scene class.`,
      },
    ],
    maxTokens: 2048,
  });

  // Extract Python code from the response
  const codeMatch = response.content.match(/```python\s*([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : response.content;

  // Extract scene name from the code
  const sceneMatch = code.match(/class\s+(\w+)\s*\(\s*Scene\s*\)/);
  const sceneName = sceneMatch ? sceneMatch[1] : "MathAnimation";

  return {
    code,
    sceneName,
    description: request.description,
  };
}
