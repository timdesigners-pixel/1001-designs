export const DEFAULTS = {
  provider: 'claude', // claude | openai | gemini | ollama | lmstudio
  claude: { apiKey: '', model: 'claude-sonnet-5-5', baseUrl: 'https://api.anthropic.com' },
  openai: { apiKey: '', model: 'gpt-4.1', baseUrl: 'https://api.openai.com' },
  gemini: { apiKey: '', model: 'gemini-2.5-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
  ollama: { model: 'qwen2.5vl:7b', baseUrl: 'http://localhost:11434' },
  lmstudio: { model: '', baseUrl: 'http://localhost:1234' },
  maxTokens: 32000,
  numCtx: 16384,
  inlineAssets: true,
  maxAssetMB: 4,
  scripts: 'strip', // strip | keep
  autoScroll: true,
  refs: { enabled: true, count: 4, maxChars: 9000, includeUser: true, pinned: [] },
};

export async function loadSettings() {
  const { settings = {} } = await chrome.storage.local.get('settings');
  return {
    ...DEFAULTS, ...settings,
    claude: { ...DEFAULTS.claude, ...settings.claude },
    openai: { ...DEFAULTS.openai, ...settings.openai },
    gemini: { ...DEFAULTS.gemini, ...settings.gemini },
    ollama: { ...DEFAULTS.ollama, ...settings.ollama },
    lmstudio: { ...DEFAULTS.lmstudio, ...settings.lmstudio },
    refs: { ...DEFAULTS.refs, ...settings.refs },
  };
}
export const saveSettings = (settings) => chrome.storage.local.set({ settings });

/** Seçili sağlayıcıyı streamModel() için düz yapılandırmaya çevirir. */
export function providerConfig(s) {
  const p = s.provider;
  return { provider: p, ...s[p], maxTokens: s.maxTokens, numCtx: s.numCtx };
}
