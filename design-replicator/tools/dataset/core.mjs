// Referans bileşen seti üretecinin ortak parçaları: tasarım belirteçleri, ikonlar, içerik havuzu.

export const PALETTES = [
  { name: 'Ocean', mode: 'light', bg: '#eef5fb', surface: '#ffffff', text: '#0f2742', muted: '#566b84', primary: '#1769e0', onPrimary: '#ffffff', border: '#d5e2f0', accent: '#00b4a6' },
  { name: 'Sunset', mode: 'light', bg: '#fff4ec', surface: '#ffffff', text: '#3a1d12', muted: '#7d5c4c', primary: '#c93b16', onPrimary: '#ffffff', border: '#f3d9c9', accent: '#f9a620' },
  { name: 'Forest', mode: 'light', bg: '#eef6ee', surface: '#ffffff', text: '#14301c', muted: '#4f6858', primary: '#1b7a42', onPrimary: '#ffffff', border: '#d3e5d6', accent: '#c9a227' },
  { name: 'Lavender', mode: 'light', bg: '#f5f1fc', surface: '#ffffff', text: '#231a3f', muted: '#625880', primary: '#6c3fe8', onPrimary: '#ffffff', border: '#e2d9f4', accent: '#ff6fb1' },
  { name: 'Mono', mode: 'light', bg: '#f4f4f4', surface: '#ffffff', text: '#111111', muted: '#616161', primary: '#111111', onPrimary: '#ffffff', border: '#dcdcdc', accent: '#e60023' },
  { name: 'Pinterest', mode: 'light', bg: '#ffffff', surface: '#ffffff', text: '#111111', muted: '#5f5f5f', primary: '#e60023', onPrimary: '#ffffff', border: '#e1e1e1', accent: '#0074e8' },
  { name: 'Slate', mode: 'light', bg: '#f1f5f9', surface: '#ffffff', text: '#0f172a', muted: '#58667a', primary: '#334155', onPrimary: '#ffffff', border: '#e2e8f0', accent: '#0284c7' },
  { name: 'Mint', mode: 'light', bg: '#effcf8', surface: '#ffffff', text: '#0b3a33', muted: '#44736b', primary: '#0b7d6b', onPrimary: '#ffffff', border: '#cdeee6', accent: '#e8583a' },
  { name: 'Rose', mode: 'light', bg: '#fff1f4', surface: '#ffffff', text: '#3b1020', muted: '#80505f', primary: '#c2255c', onPrimary: '#ffffff', border: '#f6d3dc', accent: '#6741d9' },
  { name: 'Sand', mode: 'light', bg: '#faf6ee', surface: '#fffdf8', text: '#2d2417', muted: '#6f6149', primary: '#9c5a14', onPrimary: '#ffffff', border: '#eadfca', accent: '#2f6f5e' },
  { name: 'Midnight', mode: 'dark', bg: '#0b1020', surface: '#141b34', text: '#e8ecff', muted: '#a3add4', primary: '#7b97ff', onPrimary: '#0b1020', border: '#26305a', accent: '#38e0c8' },
  { name: 'Neon', mode: 'dark', bg: '#0a0a0f', surface: '#14141d', text: '#f5f5ff', muted: '#a5a5c0', primary: '#39ff88', onPrimary: '#04130a', border: '#2a2a3c', accent: '#ff3df0' },
  { name: 'Espresso', mode: 'dark', bg: '#1a1310', surface: '#251c17', text: '#f4e9df', muted: '#b9a493', primary: '#e8a05a', onPrimary: '#1a1310', border: '#3a2d25', accent: '#8fd1a8' },
  { name: 'Graphite', mode: 'dark', bg: '#111214', surface: '#1b1d21', text: '#f2f3f5', muted: '#a0a6af', primary: '#ff4d67', onPrimary: '#111214', border: '#2c2f35', accent: '#4cc2ff' },
];

export const RADII = [
  { name: 'sharp', v: 0 }, { name: 'subtle', v: 4 }, { name: 'soft', v: 8 }, { name: 'rounded', v: 12 },
  { name: 'round', v: 16 }, { name: 'extra-round', v: 24 }, { name: 'pill', v: 999 },
];
export const SHADOWS = [
  { name: 'flat', v: 'none' },
  { name: 'subtle', v: '0 1px 3px rgba(0,0,0,.14)' },
  { name: 'lifted', v: '0 8px 24px rgba(0,0,0,.16)' },
  { name: 'deep', v: '0 20px 50px rgba(0,0,0,.3)' },
  { name: 'brutal', v: '4px 4px 0 var(--text)' },
];
export const FONTS = [
  { name: 'sans', v: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { name: 'serif', v: 'Georgia, "Times New Roman", serif' },
  { name: 'mono', v: 'ui-monospace, "Cascadia Code", Menlo, Consolas, monospace' },
  { name: 'rounded', v: 'ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif' },
];
export const DENSITIES = [
  { name: 'compact', pad: 12, gap: 8 }, { name: 'cozy', pad: 18, gap: 12 }, { name: 'spacious', pad: 26, gap: 18 },
];

const svg = (d, s = 18, sw = 2) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  heart: svg('<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 4.5 6.5 4.5c2 0 3.5 1.1 4.3 2.5.7-1.4 2.2-2.5 4.2-2.5 3.7 0 5.6 3.9 4.1 7.3C19.5 16.4 12 21 12 21z"/>'),
  star: svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
  cart: svg('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.5L21 8H6"/>'),
  bell: svg('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 0 1-3.4 0"/>'),
  chev: svg('<path d="M6 9l6 6 6-6"/>'),
  chevR: svg('<path d="M9 6l6 6-6 6"/>'),
  chevL: svg('<path d="M15 6l-6 6 6 6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  home: svg('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  warn: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'),
  send: svg('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>'),
  zap: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
  layers: svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  chart: svg('<path d="M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-3"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>'),
  eye: svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  download: svg('<path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/>', 40),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
};

export const POOL = {
  brand: ['Lumen', 'Northwind', 'Pixelio', 'Atlas', 'Verdant', 'Orbit', 'Nimbus', 'Kite', 'Aurora', 'Mosaic', 'Quill', 'Helix', 'Ember', 'Fable'],
  head: ['Design faster, ship sooner', 'Build something people love', 'Your ideas, beautifully shipped', 'Simple tools for ambitious teams', 'Make every pixel count', 'Launch in days, not months', 'Craft interfaces that feel effortless'],
  sub: ['A modern toolkit for teams that care about craft and speed.', 'Everything you need to plan, design and deliver in one place.', 'Clean components, sensible defaults and room to grow.', 'Powerful enough for pros, friendly enough for everyone.'],
  cta: ['Get started', 'Start free trial', 'Learn more', 'Book a demo', 'Join now', 'Try it free'],
  names: ['Ayşe Demir', 'Mehmet Kaya', 'Elif Şahin', 'Can Yıldız', 'Zeynep Arslan', 'Emre Koç', 'Deniz Aydın', 'Selin Çelik'],
  roles: ['Product Designer', 'Frontend Engineer', 'Founder', 'Marketing Lead', 'Data Analyst', 'UX Researcher'],
  items: ['Wireless Headphones', 'Ceramic Mug', 'Linen Shirt', 'Leather Wallet', 'Desk Lamp', 'Canvas Backpack', 'Smart Watch', 'Plant Pot'],
  quotes: ['It cut our design handoff time in half.', 'The cleanest component system we have ever used.', 'Our team shipped the redesign in two weeks.', 'Finally, a tool that gets out of the way.'],
  topics: ['Overview', 'Analytics', 'Reports', 'Settings', 'Billing', 'Team'],
  faqs: [['How does the free trial work?', 'You get full access for 14 days. No credit card required.'], ['Can I cancel anytime?', 'Yes. Cancel from your account settings whenever you like.'], ['Do you offer team discounts?', 'Teams of 10 or more receive volume pricing.'], ['Is my data secure?', 'All data is encrypted in transit and at rest.']],
};

export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- WCAG kontrast (doğrulama için)
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
