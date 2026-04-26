export const CURRENT_WEB_ONBOARDING_VERSION = 1;

export const WEB_MAX_ONBOARDING_STEPS = 5;

export const WEB_INBOX_SESSION_ID = 'inbox';

export const isDesktopRuntime = typeof __ELECTRON__ !== 'undefined' && !!__ELECTRON__;

export const RuntimeProvider = {
  Azure: 'azure',
  Bedrock: 'bedrock',
  Cloudflare: 'cloudflare',
  ComfyUI: 'comfyui',
  Ollama: 'ollama',
  OpenAI: 'openai',
  VertexAI: 'vertexai',
} as const;

export const BUILTIN_RUNTIME_PROVIDERS = new Set<string>(Object.values(RuntimeProvider));
