import type {
  HotkeyId,
  LobeAgentChatConfig,
  LobeAgentConfig,
  UserDefaultAgent,
  UserGeneralConfig,
  UserHotkeyConfig,
  UserImageConfig,
  UserMemorySettings,
  UserSettings,
  UserSystemAgentConfig,
  UserTTSConfig,
} from '@lobechat/types';

const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_MINI_PROVIDER = 'openai';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MINI_MODEL = 'gpt-5.4-mini';

export const DEFAULT_WEB_AGENT_META = {};

export const DEFAULT_WEB_AGENT_TTS_CONFIG = {
  showAllLocaleVoice: false,
  sttLocale: 'auto',
  ttsService: 'openai',
  voice: {
    openai: 'alloy',
  },
} as const;

export const DEFAULT_WEB_AGENT_SEARCH_FC_MODEL = {
  model: DEFAULT_MODEL,
  provider: DEFAULT_PROVIDER,
};

export const DEFAULT_WEB_AGENT_CHAT_CONFIG = {
  autoCreateTopicThreshold: 2,
  enableAutoCreateTopic: true,
  enableCompressHistory: true,
  enableContextCompression: true,
  enableHistoryCount: false,
  enableReasoning: false,
  enableStreaming: true,
  historyCount: 20,
  reasoningBudgetToken: 1024,
  searchFCModel: DEFAULT_WEB_AGENT_SEARCH_FC_MODEL,
  searchMode: 'auto',
} satisfies LobeAgentChatConfig;

export const DEFAULT_WEB_AGENT_CONFIG = {
  chatConfig: DEFAULT_WEB_AGENT_CHAT_CONFIG,
  model: DEFAULT_MODEL,
  openingQuestions: [],
  params: {
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 1,
    top_p: 1,
  },
  plugins: [],
  provider: DEFAULT_PROVIDER,
  systemRole: '',
  tts: DEFAULT_WEB_AGENT_TTS_CONFIG,
} satisfies LobeAgentConfig;

export const DEFAULT_WEB_AGENT = {
  config: DEFAULT_WEB_AGENT_CONFIG,
  meta: DEFAULT_WEB_AGENT_META,
} satisfies UserDefaultAgent;

export const DEFAULT_WEB_COMMON_SETTINGS: UserGeneralConfig = {
  animationMode: 'agile',
  fontSize: 14,
  highlighterTheme: 'lobe-theme',
  isDevMode: false,
  isLiteMode: false,
  mermaidTheme: 'lobe-theme',
  telemetry: true,
  transitionMode: 'fadeIn',
};

export const DEFAULT_WEB_HOTKEY_CONFIG: UserHotkeyConfig = {
  addUserMessage: 'alt+enter',
  clearCurrentMessages: 'alt+shift+backspace',
  commandPalette: 'mod+k',
  deleteAndRegenerateMessage: 'alt+shift+r',
  deleteLastMessage: 'alt+d',
  editMessage: 'alt+left-double-click',
  navigateToChat: 'ctrl+backquote',
  openChatSettings: 'alt+comma',
  openHotkeyHelper: 'ctrl+shift+slash',
  regenerateMessage: 'alt+r',
  saveDocument: 'mod+s',
  saveTopic: 'alt+n',
  search: 'mod+j',
  showApp: '',
  switchAgent: 'ctrl+1-9',
  toggleLeftPanel: 'mod+bracketleft',
  toggleRightPanel: 'mod+bracketright',
  toggleZenMode: 'mod+backslash',
} as Record<HotkeyId, string>;

export const DEFAULT_WEB_IMAGE_CONFIG: UserImageConfig = {
  defaultImageNum: 1,
};

export const DEFAULT_WEB_MEMORY_SETTINGS: UserMemorySettings = {
  enabled: true,
  effort: 'medium',
};

export const DEFAULT_WEB_NOTIFICATION_SETTINGS = {
  email: {
    enabled: true,
    items: {
      generation: {
        image_generation_completed: true,
        video_generation_completed: true,
      },
    },
  },
  inbox: {
    enabled: true,
    items: {
      generation: {
        image_generation_completed: true,
        video_generation_completed: true,
      },
    },
  },
};

const DEFAULT_WEB_SYSTEM_AGENT_ITEM = {
  model: DEFAULT_MODEL,
  provider: DEFAULT_PROVIDER,
};

const DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM = {
  model: DEFAULT_MINI_MODEL,
  provider: DEFAULT_MINI_PROVIDER,
};

export const DEFAULT_WEB_SYSTEM_AGENT_CONFIG: UserSystemAgentConfig = {
  agentMeta: DEFAULT_WEB_SYSTEM_AGENT_ITEM,
  generationTopic: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM,
  historyCompress: DEFAULT_WEB_SYSTEM_AGENT_ITEM,
  inputCompletion: {
    enabled: false,
    model: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM.model,
    provider: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM.provider,
  },
  promptRewrite: {
    enabled: true,
    model: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM.model,
    provider: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM.provider,
  },
  queryRewrite: {
    enabled: true,
    model: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM.model,
    provider: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM.provider,
  },
  thread: DEFAULT_WEB_SYSTEM_AGENT_ITEM,
  topic: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM,
  translation: DEFAULT_WEB_MINI_SYSTEM_AGENT_ITEM,
};

export const DEFAULT_WEB_TOOL_CONFIG = {};

export const DEFAULT_WEB_TTS_CONFIG: UserTTSConfig = {
  openAI: {
    sttModel: 'whisper-1',
    ttsModel: 'tts-1',
  },
  sttAutoStop: true,
  sttServer: 'openai',
};

export const DEFAULT_WEB_SETTINGS: UserSettings = {
  defaultAgent: DEFAULT_WEB_AGENT,
  general: DEFAULT_WEB_COMMON_SETTINGS,
  hotkey: DEFAULT_WEB_HOTKEY_CONFIG,
  image: DEFAULT_WEB_IMAGE_CONFIG,
  keyVaults: {},
  languageModel: {} as UserSettings['languageModel'],
  memory: DEFAULT_WEB_MEMORY_SETTINGS,
  notification: DEFAULT_WEB_NOTIFICATION_SETTINGS,
  systemAgent: DEFAULT_WEB_SYSTEM_AGENT_CONFIG,
  tool: DEFAULT_WEB_TOOL_CONFIG,
  tts: DEFAULT_WEB_TTS_CONFIG,
};
