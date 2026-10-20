// Tema yönetimi: Otomatik (sistem) / Koyu / Açık. Tercih chrome.storage.local('theme') içinde saklanır
// ve localStorage'a yansıtılır; theme-init.js ilk boyamadan önce senkron okuyup uygular.
const KEY = 'dr-theme';
const ORDER = ['auto', 'dark', 'light'];
const LABEL = { auto: 'Otomatik', dark: 'Koyu', light: 'Açık' };
const ICON = { auto: '◐', dark: '☾', light: '☀' };
const mq = matchMedia('(prefers-color-scheme: dark)');

/** Şu anda etkin olan tema: 'dark' | 'light' */
export const resolvedTheme = () => document.documentElement.dataset.theme || (mq.matches ? 'dark' : 'light');

export function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === 'dark' || pref === 'light') root.dataset.theme = pref;
  else delete root.dataset.theme;
  try {
    if (pref === 'dark' || pref === 'light') localStorage.setItem(KEY, pref);
    else localStorage.removeItem(KEY);
  } catch { /* depolama kapalı olabilir */ }
}

/**
 * Düğmeyi tema döngüsüne bağlar. onChange(resolved) tema her değiştiğinde (sistem değişimi dahil) çağrılır.
 * Dönen değer: başlangıçta etkin tema.
 */
export async function initTheme(button, onChange) {
  const { theme } = await chrome.storage.local.get('theme');
  let cur = ORDER.includes(theme) ? theme : 'auto';
  applyTheme(cur);

  const render = () => {
    button.textContent = `${ICON[cur]} ${LABEL[cur]}`;
    button.title = `Tema: ${LABEL[cur]} (tıklayınca değişir)`;
    button.setAttribute('aria-label', button.title);
  };
  render();

  button.addEventListener('click', async () => {
    cur = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
    applyTheme(cur);
    render();
    await chrome.storage.local.set({ theme: cur });
    if (onChange) onChange(resolvedTheme());
  });

  // Başka bir uzantı sayfasında değiştirildiyse eşitle
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local' || !ch.theme) return;
    cur = ORDER.includes(ch.theme.newValue) ? ch.theme.newValue : 'auto';
    applyTheme(cur);
    render();
    if (onChange) onChange(resolvedTheme());
  });
  mq.addEventListener('change', () => { if (cur === 'auto' && onChange) onChange(resolvedTheme()); });
  return resolvedTheme();
}
