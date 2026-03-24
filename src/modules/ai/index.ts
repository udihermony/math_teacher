export { askClaude, streamClaude } from "./claude-client";
export type { AskOptions, AIResponse } from "./claude-client";
export type { CompanionContext, AIMessage } from "./types";
export { buildCompanionContext } from "./context-builder";
export { assembleCompanionPrompt } from "./prompts/companion";
