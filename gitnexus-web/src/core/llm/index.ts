
/**
 * LLM Module Exports
 *
 * Provides Graph RAG agent capabilities for code analysis.
 */

// Types
export * from './types';
// NOTE  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VkdsNGJBPT06OGU2NDdkMzc=

// Settings management
export {
  loadSettings,
  saveSettings,
  updateProviderSettings,
  setActiveProvider,
  getActiveProviderConfig,
  isProviderConfigured,
  clearSettings,
  getProviderDisplayName,
  getAvailableModels,
} from './settings-service';

// Tools
export { createGraphRAGTools } from './tools';
// eslint-disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VkdsNGJBPT06OGU2NDdkMzc=

// Context Builder
export {
  buildCodebaseContext,
  formatContextForPrompt,
  buildDynamicSystemPrompt,
  type CodebaseContext,
  type CodebaseStats,
  type Hotspot,
} from './context-builder';

// Agent
export {
  createChatModel,
  createGraphRAGAgent,
  streamAgentResponse,
  invokeAgent,
  BASE_SYSTEM_PROMPT,
  type AgentMessage,
} from './agent';
