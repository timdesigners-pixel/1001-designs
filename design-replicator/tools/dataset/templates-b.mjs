// Bileşen şablonları (2/2).
import { I } from './core.mjs';

const L = (n, d, h, c, j = '') => ({ n, d, h, c, j });
const T = [];
const add = (cat, title, tags, layouts) => T.push({ cat, title, tags, layouts });
const initials = (s) => s.split(' ').map((w) => w[0]).join('').slice(0, 2);
const grad = 'linear-gradient(135deg,var(--primary),var(--accent))';

/* 22 ───────── checklist */
add('checklist', 'Checklist', ['checkbox', 'radio', 'list', 'form', 'interactive'], [
  L('Task list', 'Checkbox task list with a live completed counter and strikethrough.',
    () => `<div class="cl"><h4>Launch checklist <small class="c">1/4</small></h4>${['Write release notes', 'Update documentation', 'Run accessibility audit', 'Announce on social'].map((t, i) => `<label><input type="checkbox" ${i === 0 ? 'checked' : ''}><span class="bx">${I.check}</span><span class="t">${t}</span></label>`).join('')}</div>`,
    `& .cl{display:grid;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--pad);width:min(100%,340px)}& h4{display:flex;justify-content:space-between;margin-bottom:6px;font-size:17px}& small{color:var(--muted);font-weight:500}& label{display:flex;gap:10px;align-items:center;padding:8px 4px;cursor:pointer}& input{position:absolute;opacity:0}& .bx{width:22px;height:22px;border-radius:calc(var(--radius) / 2);border:2px solid var(--border);display:grid;place-items:center;color:transparent;transition:all .15s;flex:none}& .bx svg{width:14px;height:14px}& input:checked+.bx{background:var(--primary);border-color:var(--primary);color:var(--on-primary)}& input:checked~.t{text-decoration:line-through;color:var(--muted)}& input:focus-visible+.bx{outline:3px solid var(--accent)}`,
    `const ins = [...root.querySelectorAll('input')], c = root.querySelector('.c'); const upd = () => { c.textContent = ins.filter((i) => i.checked).length + '/' + ins.length; }; ins.forEach((i) => i.addEventListener('change', upd)); upd();`),
  L('Radio cards', 'Selectable option cards implemented with radio inputs.',
    () => `<fieldset class="rc"><legend>Choose a plan</legend>${[['Starter', 'For individuals', '$9'], ['Team', 'For growing teams', '$29'], ['Business', 'For organizations', '$79']].map(([n, d, pr], i) => `<label><input type="radio" name="pl" ${i === 1 ? 'checked' : ''}><span class="cd"><b>${n}</b><small>${d}</small><em>${pr}/mo</em></span></label>`).join('')}</fieldset>`,
    `& .rc{border:0;padding:0;display:grid;gap:8px;width:min(100%,360px)}& legend{font-weight:700;margin-bottom:8px}& label{cursor:pointer}& input{position:absolute;opacity:0}& .cd{display:grid;grid-template-columns:1fr auto;gap:2px 12px;background:var(--surface);border:2px solid var(--border);border-radius:var(--radius);padding:12px 16px;transition:all .15s}& .cd small{color:var(--muted)}& .cd em{grid-row:1/3;grid-column:2;align-self:center;font-style:normal;font-weight:700}& input:checked+.cd{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 8%,var(--surface))}& input:focus-visible+.cd{outline:3px solid var(--accent)}`),
]);

/* 23 ───────── progress */
add('progress', 'Progress', ['progress', 'loading', 'steps', 'interactive'], [
  L('Bars', 'Labeled progress bars with an animated fill and a simulated upload.',
    () => `<div class="pg">${[['Design', 82], ['Development', 56], ['Testing', 34]].map(([n, v]) => `<div class="r"><div class="l"><span>${n}</span><b>${v}%</b></div><div class="bar" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><i style="width:${v}%"></i></div></div>`).join('')}<button type="button" class="up">Simulate upload</button></div>`,
    `& .pg{display:grid;gap:14px;width:min(100%,380px)}& .l{display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px}& .bar{height:10px;background:var(--border);border-radius:var(--radius-ctl);overflow:hidden}& .bar i{display:block;height:100%;background:${grad};border-radius:inherit;transition:width .4s}& .up{justify-self:start;background:var(--primary);color:var(--on-primary);border:0;border-radius:var(--radius-ctl);padding:9px 18px;font-weight:600;cursor:pointer}`,
    `const b = root.querySelector('.up'); b.addEventListener('click', () => { const bars = [...root.querySelectorAll('.bar i')]; let v = 0; b.disabled = true; const t = setInterval(() => { v += 8; bars.forEach((x) => (x.style.width = Math.min(v, 100) + '%')); root.querySelectorAll('.l b').forEach((x) => (x.textContent = Math.min(v, 100) + '%')); if (v >= 100) { clearInterval(t); b.disabled = false; } }, 120); });`),
  L('Steps', 'Multi-step progress indicator with next and back controls.',
    () => `<div class="st"><ol>${['Account', 'Profile', 'Payment', 'Done'].map((s, i) => `<li class="${i === 0 ? 'on' : ''}"><i>${i + 1}</i><span>${s}</span></li>`).join('')}</ol><div class="ac"><button type="button" class="bk" disabled>Back</button><button type="button" class="nx">Next</button></div></div>`,
    `& .st{display:grid;gap:18px;width:min(100%,460px)}& ol{display:flex;list-style:none;padding:0;justify-content:space-between;position:relative}& ol::before{content:"";position:absolute;left:16px;right:16px;top:15px;height:3px;background:var(--border)}& li{position:relative;display:grid;justify-items:center;gap:6px;font-size:13px;color:var(--muted)}& li i{width:32px;height:32px;border-radius:50%;background:var(--surface);border:2px solid var(--border);display:grid;place-items:center;font-style:normal;font-weight:700}& li.on i{background:var(--primary);border-color:var(--primary);color:var(--on-primary)}& li.on{color:var(--text)}& .ac{display:flex;justify-content:space-between}& .ac button{border-radius:var(--radius-ctl);padding:9px 20px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--surface)}& .nx{background:var(--primary)!important;color:var(--on-primary);border-color:var(--primary)!important}& .ac button[disabled]{opacity:.4;cursor:not-allowed}`,
    `const li = [...root.querySelectorAll('li')], bk = root.querySelector('.bk'), nx = root.querySelector('.nx'); let s = 0; const go = (k) => { s = Math.max(0, Math.min(li.length - 1, k)); li.forEach((x, n) => x.classList.toggle('on', n <= s)); bk.disabled = s === 0; nx.textContent = s === li.length - 1 ? 'Finish' : 'Next'; }; nx.addEventListener('click', () => go(s + 1)); bk.addEventListener('click', () => go(s - 1));`),
]);

/* 24 ───────── stats */
add('stats', 'Stats / KPI', ['stats', 'kpi', 'dashboard', 'metrics'], [
  L('KPI cards', 'Dashboard KPI cards with trend indicators and sparklines.',
    () => `<div class="g">${[['Revenue', '$48.2k', '+12.4%', 1], ['Users', '8,420', '+5.1%', 1], ['Churn', '2.3%', '-0.4%', 0]].map(([l, v, d, up], i) => `<article class="k"><span>${l}</span><b>${v}</b><em class="${up ? 'up' : 'dn'}">${d}</em><svg viewBox="0 0 80 24" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2" points="0,18 16,12 32,15 48,6 64,9 80,${3 + i * 5}"/></svg></article>`).join('')}</div>`,
    `& .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--gap)}& .k{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:var(--pad);display:grid;gap:4px;box-shadow:var(--shadow)}& .k span{color:var(--muted);font-size:13px}& .k b{font-size:28px}& em{font-style:normal;font-size:13px;font-weight:700}& .up{color:#1f9d55}& .dn{color:#d64545}& svg{width:100%;height:28px;color:var(--primary);margin-top:6px}`),
  L('Inline', 'Compact inline statistics separated by dividers.',
    () => `<dl class="in">${[['12k+', 'Customers'], ['99.9%', 'Uptime'], ['24/7', 'Support'], ['150', 'Countries']].map(([v, l]) => `<div><dt>${v}</dt><dd>${l}</dd></div>`).join('')}</dl>`,
    `& .in{display:flex;flex-wrap:wrap;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin:0}& .in div{flex:1;min-width:110px;padding:var(--pad);text-align:center;border-right:1px solid var(--border)}& .in div:last-child{border:0}& dt{font-size:26px;font-weight:800;color:var(--primary)}& dd{margin:0;color:var(--muted);font-size:13px}`),
]);

/* 25 ───────── testimonial */
add('testimonial', 'Testimonial', ['testimonial', 'quote', 'social-proof', 'review'], [
  L('Quote card', 'Single testimonial card with quote, avatar and author.',
    (p) => `<figure class="q"><blockquote>“${p.quote(0)}”</blockquote><figcaption><span class="av">${initials(p.name(0))}</span><span><b>${p.name(0)}</b><small>${p.role(0)}, ${p.brand}</small></span></figcaption></figure>`,
    `& .q{margin:0;max-width:420px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--pad);display:grid;gap:14px}& blockquote{margin:0;font-size:19px;line-height:1.4;font-weight:600}& figcaption{display:flex;gap:12px;align-items:center}& .av{width:44px;height:44px;border-radius:50%;background:${grad};color:var(--on-primary);display:grid;place-items:center;font-weight:700}& small{display:block;color:var(--muted)}`),
  L('Grid', 'Three testimonials in a responsive grid with star ratings.',
    (p) => `<div class="g">${[0, 1, 2].map((i) => `<figure class="q"><div class="s">${I.star.repeat(5)}</div><blockquote>${p.quote(i)}</blockquote><figcaption><b>${p.name(i)}</b><small>${p.role(i)}</small></figcaption></figure>`).join('')}</div>`,
    `& .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--gap)}& .q{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:var(--pad);display:grid;gap:10px;align-content:start}& .s{display:flex;color:#f5a524}& .s svg{fill:currentColor;width:16px;height:16px}& blockquote{margin:0;line-height:1.45}& small{display:block;color:var(--muted)}`),
]);

/* 26 ───────── features */
const FEATS = [[I.zap, 'Lightning fast', 'Optimized for speed at every layer.'], [I.shield, 'Secure by default', 'Encryption and access control built in.'], [I.layers, 'Composable', 'Mix and match building blocks freely.'], [I.chart, 'Insightful', 'Track what matters with clear reports.']];
add('features', 'Feature section', ['features', 'grid', 'icons', 'marketing'], [
  L('Icon grid', 'Feature grid with icon tiles, titles and descriptions.',
    () => `<div class="g">${FEATS.map(([ic, t, d]) => `<div class="f"><span class="ic">${ic}</span><h4>${t}</h4><p>${d}</p></div>`).join('')}</div>`,
    `& .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--gap)}& .f{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:var(--pad);display:grid;gap:8px;align-content:start;transition:transform .2s}& .f:hover{transform:translateY(-3px)}& .ic{width:44px;height:44px;border-radius:var(--radius);background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);display:grid;place-items:center}& h4{font-size:16px}& p{color:var(--muted);font-size:14px}`),
  L('List', 'Vertical feature list with numbered markers.',
    () => `<ol class="l">${FEATS.map(([, t, d], i) => `<li><i>${i + 1}</i><div><h4>${t}</h4><p>${d}</p></div></li>`).join('')}</ol>`,
    `& .l{list-style:none;padding:0;display:grid;gap:var(--gap);max-width:460px}& li{display:flex;gap:14px;align-items:flex-start}& i{flex:none;width:36px;height:36px;border-radius:50%;background:var(--primary);color:var(--on-primary);display:grid;place-items:center;font-style:normal;font-weight:700}& h4{font-size:16px}& p{color:var(--muted);font-size:14px}`),
]);

/* 27 ───────── timeline */
const TL = [['2023', 'Founded', 'The first prototype shipped.'], ['2024', 'Seed round', 'Grew the team to twelve people.'], ['2025', 'Global launch', 'Opened to customers worldwide.'], ['2026', 'v2.0', 'A redesigned platform arrived.']];
add('timeline', 'Timeline', ['timeline', 'history', 'steps', 'list'], [
  L('Vertical', 'Vertical timeline with a connecting line and dots.',
    () => `<ol class="tl">${TL.map(([y, t, d]) => `<li><span class="y">${y}</span><h4>${t}</h4><p>${d}</p></li>`).join('')}</ol>`,
    `& .tl{list-style:none;padding:0 0 0 22px;margin:0;position:relative;max-width:380px}& .tl::before{content:"";position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:var(--border)}& li{position:relative;padding-bottom:20px}& li::before{content:"";position:absolute;left:-22px;top:5px;width:14px;height:14px;border-radius:50%;background:var(--primary);border:3px solid var(--bg)}& .y{font-size:12px;font-weight:700;color:var(--primary)}& h4{font-size:16px}& p{color:var(--muted);font-size:14px}`),
  L('Horizontal', 'Horizontal timeline that scrolls on small screens.',
    () => `<ol class="tl">${TL.map(([y, t, d]) => `<li><i></i><span class="y">${y}</span><h4>${t}</h4><p>${d}</p></li>`).join('')}</ol>`,
    `& .tl{list-style:none;padding:0;margin:0;display:flex;gap:var(--gap);overflow-x:auto;position:relative;padding-top:10px}& li{flex:0 0 170px;position:relative;padding-top:22px;border-top:2px solid var(--border)}& li i{position:absolute;top:-8px;left:0;width:14px;height:14px;border-radius:50%;background:var(--primary)}& .y{font-size:12px;font-weight:700;color:var(--primary)}& h4{font-size:16px}& p{color:var(--muted);font-size:14px}`),
]);

/* 28 ───────── table */
const ROWS = (p) => [0, 1, 2, 3, 4].map((i) => [p.name(i), p.role(i), ['Active', 'Pending', 'Active', 'Offline', 'Active'][i], [24, 18, 31, 22, 27][i]]);
const TBL_CSS = `& .w{overflow-x:auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}& table{border-collapse:collapse;width:100%;font-size:14px;min-width:420px}& th,& td{text-align:left;padding:12px var(--pad)}& th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)}& td{border-bottom:1px solid var(--border)}& tr:last-child td{border:0}& tbody tr:hover{background:color-mix(in srgb,var(--primary) 6%,transparent)}& .pill{font-size:12px;font-weight:700;padding:3px 10px;border-radius:var(--radius-ctl);background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary)}`;
add('table', 'Data table', ['table', 'data', 'list', 'sort', 'interactive'], [
  L('Basic', 'Clean responsive data table with status pills and row hover.',
    (p) => `<div class="w"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Age</th></tr></thead><tbody>${ROWS(p).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="pill">${r[2]}</span></td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`, TBL_CSS),
  L('Sortable', 'Data table with sortable column headers (click to toggle ascending/descending).',
    (p) => `<div class="w"><table><thead><tr><th><button data-k="0">Name</button></th><th><button data-k="1">Role</button></th><th><button data-k="3">Age</button></th></tr></thead><tbody>${ROWS(p).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`,
    `${TBL_CSS}& th button{background:none;border:0;font:inherit;color:inherit;text-transform:inherit;letter-spacing:inherit;cursor:pointer}& th button::after{content:" ↕";opacity:.4}& th button.asc::after{content:" ↑";opacity:1}& th button.desc::after{content:" ↓";opacity:1}`,
    `const tb = root.querySelector('tbody'); root.querySelectorAll('th button').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.k, asc = !b.classList.contains('asc'); root.querySelectorAll('th button').forEach((x) => x.classList.remove('asc', 'desc')); b.classList.add(asc ? 'asc' : 'desc'); const rows = [...tb.rows].sort((a, c) => { const x = a.cells[k === 3 ? 2 : k].textContent, y = c.cells[k === 3 ? 2 : k].textContent; return (k === 3 ? x - y : x.localeCompare(y)) * (asc ? 1 : -1); }); rows.forEach((r) => tb.appendChild(r)); }));`),
]);

/* 29 ───────── pagination */
add('pagination', 'Pagination', ['pagination', 'navigation', 'list', 'interactive'], [
  L('Numbers', 'Numbered pagination with previous/next and active page state.',
    () => `<nav class="pgn" aria-label="Pagination"><button class="pv" aria-label="Previous">${I.chevL}</button>${[1, 2, 3, 4, 5].map((n) => `<button class="n ${n === 1 ? 'on' : ''}">${n}</button>`).join('')}<button class="nx" aria-label="Next">${I.chevR}</button></nav>`,
    `& .pgn{display:flex;gap:6px;flex-wrap:wrap}& .pgn button{min-width:40px;height:40px;border-radius:var(--radius-ctl);border:1px solid var(--border);background:var(--surface);cursor:pointer;display:grid;place-items:center;font-weight:600}& .pgn button:hover{border-color:var(--primary)}& .pgn .on{background:var(--primary);border-color:var(--primary);color:var(--on-primary)}& .pgn button[disabled]{opacity:.4;cursor:not-allowed}`,
    `const ns = [...root.querySelectorAll('.n')], pv = root.querySelector('.pv'), nx = root.querySelector('.nx'); let c = 0; const go = (k) => { c = Math.max(0, Math.min(ns.length - 1, k)); ns.forEach((x, i) => x.classList.toggle('on', i === c)); pv.disabled = c === 0; nx.disabled = c === ns.length - 1; }; ns.forEach((x, i) => x.addEventListener('click', () => go(i))); pv.addEventListener('click', () => go(c - 1)); nx.addEventListener('click', () => go(c + 1)); go(0);`),
  L('Compact', 'Compact prev/next pager with a page indicator.',
    () => `<nav class="pgn" aria-label="Pagination"><button class="pv">${I.chevL} Prev</button><span>Page <b class="c">1</b> of 8</span><button class="nx">Next ${I.chevR}</button></nav>`,
    `& .pgn{display:inline-flex;gap:14px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-ctl);padding:6px}& button{display:inline-flex;gap:4px;align-items:center;border:0;background:var(--primary);color:var(--on-primary);border-radius:var(--radius-ctl);padding:8px 16px;font-weight:600;cursor:pointer}& button[disabled]{opacity:.4;cursor:not-allowed}& span{font-size:14px;color:var(--muted)}`,
    `const c = root.querySelector('.c'), pv = root.querySelector('.pv'), nx = root.querySelector('.nx'); let p = 1; const go = (k) => { p = Math.max(1, Math.min(8, k)); c.textContent = p; pv.disabled = p === 1; nx.disabled = p === 8; }; pv.addEventListener('click', () => go(p - 1)); nx.addEventListener('click', () => go(p + 1)); go(1);`),
]);

/* 30 ───────── breadcrumb */
add('breadcrumb', 'Breadcrumb', ['breadcrumb', 'navigation', 'path'], [
  L('Chevron', 'Breadcrumb trail separated by chevrons with the current page highlighted.',
    (p) => `<nav aria-label="Breadcrumb"><ol>${['Home', 'Library', p.topic(1)].map((t) => `<li><a href="#">${t}</a>${I.chevR}</li>`).join('')}<li aria-current="page">${p.item(0)}</li></ol></nav>`,
    `& ol{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0;align-items:center}& li{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:14px}& a{color:var(--muted);text-decoration:none}& a:hover{color:var(--primary)}& li[aria-current]{color:var(--text);font-weight:700}& svg{width:14px;height:14px}`),
  L('Slash pill', 'Slash-separated breadcrumb in a rounded container.',
    (p) => `<nav aria-label="Breadcrumb"><ol>${['Home', 'Shop', p.topic(2)].map((t) => `<li><a href="#">${t}</a><span>/</span></li>`).join('')}<li aria-current="page">${p.item(1)}</li></ol></nav>`,
    `& ol{display:inline-flex;flex-wrap:wrap;gap:8px;list-style:none;padding:8px 16px;margin:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-ctl);font-size:14px}& li{display:flex;gap:8px;color:var(--muted)}& a{color:var(--text);text-decoration:none}& a:hover{color:var(--primary)}& li[aria-current]{color:var(--primary);font-weight:700}`),
]);

/* 31 ───────── avatar */
add('avatar', 'Avatar', ['avatar', 'user', 'group', 'status'], [
  L('Group', 'Overlapping avatar group with an overflow count.',
    (p) => `<div class="gr">${[0, 1, 2, 3].map((i) => `<span class="a" style="--h:${i * 55}" title="${p.name(i)}">${initials(p.name(i))}</span>`).join('')}<span class="a more">+8</span></div>`,
    `& .gr{display:flex}& .a{width:44px;height:44px;border-radius:50%;border:3px solid var(--bg);margin-left:-12px;display:grid;place-items:center;font-size:14px;font-weight:700;color:var(--on-primary);background:linear-gradient(calc(135deg + var(--h)*1deg),var(--primary),var(--accent))}& .a:first-child{margin-left:0}& .more{background:var(--surface);color:var(--text);border-color:var(--bg);box-shadow:inset 0 0 0 1px var(--border)}`),
  L('Status', 'Avatars with online / away / busy presence indicators.',
    (p) => `<div class="gr">${[['online', 0], ['away', 1], ['busy', 2], ['offline', 3]].map(([s, i]) => `<span class="a" style="--h:${i * 55}">${initials(p.name(i))}<i class="${s}" title="${s}"></i></span>`).join('')}</div>`,
    `& .gr{display:flex;gap:14px}& .a{position:relative;width:48px;height:48px;border-radius:var(--radius-ctl);display:grid;place-items:center;font-weight:700;color:var(--on-primary);background:linear-gradient(calc(135deg + var(--h)*1deg),var(--primary),var(--accent))}& i{position:absolute;right:-3px;bottom:-3px;width:14px;height:14px;border-radius:50%;border:3px solid var(--bg);background:#999}& .online{background:#1f9d55}& .away{background:#d98a00}& .busy{background:#d64545}`),
]);

/* 32 ───────── tooltip */
add('tooltip', 'Tooltip / Popover', ['tooltip', 'popover', 'hint', 'interactive', 'a11y'], [
  L('Hover tooltip', 'CSS tooltips shown on hover and keyboard focus.',
    () => `<div class="row">${[['Edit', 'Edit item'], ['Share', 'Share link'], ['Delete', 'Remove permanently']].map(([l, t]) => `<button class="tt" type="button" data-tip="${t}">${l}</button>`).join('')}</div>`,
    `& .row{display:flex;gap:12px;padding-top:34px}& .tt{position:relative;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-ctl);padding:10px 18px;font-weight:600;cursor:pointer}& .tt::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);background:var(--text);color:var(--bg);font-size:12px;font-weight:600;padding:6px 10px;border-radius:calc(var(--radius) / 2);white-space:nowrap;opacity:0;pointer-events:none;transition:all .15s}& .tt:hover::after,& .tt:focus-visible::after{opacity:1;transform:translateX(-50%)}`),
  L('Click popover', 'Click-to-open popover card that closes on outside click.',
    (p) => `<div class="pp"><button class="tr" type="button" aria-expanded="false">${I.info} Details</button><div class="pop" role="dialog" hidden><h4>${p.item(0)}</h4><p>${p.sub}</p><a href="#">${p.cta}</a></div></div>`,
    `& .pp{position:relative;display:inline-block}& .tr{display:inline-flex;gap:6px;align-items:center;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-ctl);padding:10px 18px;font-weight:600;cursor:pointer}& .pop{position:absolute;top:calc(100% + 8px);left:0;width:260px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--pad);display:grid;gap:6px;z-index:10}& h4{font-size:15px}& p{color:var(--muted);font-size:14px}& a{color:var(--primary);font-weight:600}`,
    `const t = root.querySelector('.tr'), p = root.querySelector('.pop'); const set = (o) => { p.hidden = !o; t.setAttribute('aria-expanded', o); }; t.addEventListener('click', () => set(p.hidden)); document.addEventListener('click', (e) => { if (!root.contains(e.target)) set(false); }); document.addEventListener('keydown', (e) => e.key === 'Escape' && set(false));`),
]);

/* 33 ───────── skeleton */
const SK = `@keyframes dr-sh{to{background-position:-200% 0}}& .sk{background:linear-gradient(90deg,var(--border) 25%,color-mix(in srgb,var(--border) 40%,var(--surface)) 50%,var(--border) 75%);background-size:200% 100%;animation:dr-sh 1.4s linear infinite;border-radius:calc(var(--radius) / 2)}`;
add('skeleton', 'Skeleton loader', ['skeleton', 'loading', 'placeholder', 'interactive'], [
  L('Card', 'Card skeleton that swaps to real content after a short delay.',
    (p) => `<article class="c"><div class="ld"><div class="sk im"></div><div class="sk l1"></div><div class="sk l2"></div></div><div class="re" hidden><div class="im" style="background:${grad}"></div><h4>${p.head}</h4><p>${p.sub}</p></div></article>`,
    `${SK}& .c{width:min(100%,300px);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px;display:grid}& .ld,& .re{display:grid;gap:10px}& .im{height:140px;border-radius:calc(var(--radius) - 4px)}& .l1{height:16px;width:80%}& .l2{height:12px;width:55%}& h4{font-size:16px}& p{color:var(--muted);font-size:14px}`,
    `const ld = root.querySelector('.ld'), re = root.querySelector('.re'); setTimeout(() => { ld.hidden = true; re.hidden = false; }, 2200);`),
  L('List', 'List-row skeletons with avatar and two text lines.',
    () => `<div class="ls">${[0, 1, 2].map(() => `<div class="rw"><div class="sk av"></div><div class="tx"><div class="sk a"></div><div class="sk b"></div></div></div>`).join('')}</div>`,
    `${SK}& .ls{display:grid;gap:14px;width:min(100%,340px)}& .rw{display:flex;gap:12px;align-items:center}& .av{width:46px;height:46px;border-radius:50%!important;flex:none}& .tx{flex:1;display:grid;gap:8px}& .a{height:14px;width:70%}& .b{height:11px;width:45%}`),
]);

/* 34 ───────── empty-state */
add('empty-state', 'Empty state', ['empty', 'placeholder', 'zero-data', 'onboarding'], [
  L('Illustration', 'Empty state with an icon illustration, message and primary action.',
    (p) => `<div class="em"><div class="ill">${I.image.replace('width="18" height="18"', 'width="42" height="42"')}</div><h3>No projects yet</h3><p>Create your first project to get started with ${p.brand}.</p><button type="button">${I.plus} New project</button></div>`,
    `& .em{text-align:center;max-width:360px;display:grid;gap:10px;justify-items:center;padding:var(--pad)}& .ill{width:96px;height:96px;border-radius:50%;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);display:grid;place-items:center}& h3{font-size:20px}& p{color:var(--muted)}& button{display:inline-flex;gap:6px;align-items:center;background:var(--primary);color:var(--on-primary);border:0;border-radius:var(--radius-ctl);padding:11px 22px;font-weight:700;cursor:pointer;margin-top:6px}`),
  L('Dashed', 'Dashed drop-zone style empty state for uploads.',
    () => `<label class="dz"><input type="file" hidden><span>${I.download}</span><b>Drop files here</b><small>or click to browse · PNG, JPG up to 5 MB</small></label>`,
    `& .dz{display:grid;gap:4px;justify-items:center;width:min(100%,380px);padding:34px var(--pad);border:2px dashed var(--border);border-radius:var(--radius);cursor:pointer;text-align:center;transition:all .15s}& .dz:hover{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 6%,transparent)}& small{color:var(--muted)}`),
]);

/* 35 ───────── cta */
add('cta', 'Call to action', ['cta', 'banner', 'marketing', 'conversion'], [
  L('Banner', 'Full-width gradient call-to-action banner.',
    (p) => `<section class="cta"><div><h3>${p.head}</h3><p>${p.sub}</p></div><button type="button">${p.cta} ${I.arrow}</button></section>`,
    `& .cta{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;background:${grad};color:var(--on-primary);border-radius:var(--radius);padding:calc(var(--pad)*1.4);box-shadow:var(--shadow)}& h3{font-size:24px;line-height:1.2}& p{opacity:.9;margin-top:4px;max-width:440px}& button{display:inline-flex;gap:8px;align-items:center;background:var(--surface);color:var(--text);border:0;border-radius:var(--radius-ctl);padding:13px 24px;font-weight:700;cursor:pointer}`),
  L('Split', 'Bordered call-to-action with copy and two buttons.',
    (p) => `<section class="cta"><h3>${p.head}</h3><p>${p.sub}</p><div class="a"><button class="pri" type="button">${p.cta}</button><button class="sec" type="button">Contact sales</button></div></section>`,
    `& .cta{text-align:center;max-width:560px;margin:auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:calc(var(--pad)*1.6);display:grid;gap:10px;justify-items:center}& h3{font-size:26px}& p{color:var(--muted)}& .a{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}& .pri{background:var(--primary);color:var(--on-primary);border:0;border-radius:var(--radius-ctl);padding:12px 24px;font-weight:700;cursor:pointer}& .sec{background:none;border:1.5px solid var(--border);border-radius:var(--radius-ctl);padding:12px 24px;font-weight:700;cursor:pointer}`),
]);

/* 36 ───────── sidebar */
const SBI = [[I.home, 'Home'], [I.chart, 'Analytics'], [I.layers, 'Projects'], [I.user, 'Team'], [I.gear, 'Settings']];
add('sidebar', 'Sidebar', ['sidebar', 'navigation', 'dashboard', 'menu', 'interactive'], [
  L('Collapsible', 'Dashboard sidebar that collapses to an icon rail with a toggle.',
    (p) => `<aside class="sb"><div class="hd"><b>${p.brand}</b><button class="tg" type="button" aria-label="Toggle sidebar">${I.menu}</button></div><nav>${SBI.map(([ic, t], i) => `<a href="#" class="${i === 0 ? 'on' : ''}">${ic}<span>${t}</span></a>`).join('')}</nav></aside>`,
    `& .sb{width:220px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:12px;display:grid;gap:12px;transition:width .25s;overflow:hidden}& .sb.c{width:68px}& .hd{display:flex;justify-content:space-between;align-items:center;white-space:nowrap}& .hd b{color:var(--primary);font-size:18px}& .tg{background:none;border:0;cursor:pointer;color:var(--text);padding:4px}& nav{display:grid;gap:4px}& a{display:flex;gap:12px;align-items:center;padding:10px;border-radius:var(--radius);color:var(--muted);text-decoration:none;font-weight:600;white-space:nowrap}& a:hover{background:color-mix(in srgb,var(--primary) 8%,transparent)}& a.on{background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary)}& a svg{flex:none}& .sb.c .hd b,& .sb.c a span{display:none}`,
    `const sb = root.querySelector('.sb'); root.querySelector('.tg').addEventListener('click', () => sb.classList.toggle('c')); root.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); root.querySelectorAll('nav a').forEach((x) => x.classList.remove('on')); a.classList.add('on'); }));`),
  L('Icon rail', 'Slim icon-only rail with tooltips and an active indicator.',
    () => `<aside class="rl">${SBI.map(([ic, t], i) => `<a href="#" class="${i === 0 ? 'on' : ''}" title="${t}" aria-label="${t}">${ic}</a>`).join('')}</aside>`,
    `& .rl{display:grid;gap:6px;width:60px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:8px;box-shadow:var(--shadow)}& a{height:44px;display:grid;place-items:center;border-radius:var(--radius);color:var(--muted);position:relative}& a:hover{background:color-mix(in srgb,var(--primary) 8%,transparent)}& a.on{background:var(--primary);color:var(--on-primary)}`,
    `root.querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); root.querySelectorAll('a').forEach((x) => x.classList.remove('on')); a.classList.add('on'); }));`),
]);

/* 37 ───────── chat */
const CHAT_JS = `const f = root.querySelector('form'), box = root.querySelector('.msgs'); const add = (t, me) => { const d = document.createElement('div'); d.className = 'm ' + (me ? 'me' : 'th'); d.textContent = t; box.appendChild(d); box.scrollTop = box.scrollHeight; }; f.addEventListener('submit', (e) => { e.preventDefault(); const v = f.t.value.trim(); if (!v) return; add(v, true); f.t.value = ''; setTimeout(() => add('Thanks! We will get back to you shortly.', false), 700); });`;
const CHAT_CSS = `& .ch{width:min(100%,340px);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;display:grid;grid-template-rows:auto 1fr auto}& .top{padding:12px var(--pad);background:${grad};color:var(--on-primary);font-weight:700}& .msgs{padding:12px;display:grid;gap:8px;align-content:start;height:210px;overflow-y:auto}& .m{max-width:80%;padding:8px 13px;border-radius:calc(var(--radius) + 4px);font-size:14px}& .th{background:var(--bg);justify-self:start}& .me{background:var(--primary);color:var(--on-primary);justify-self:end}& form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--border)}& input{flex:1;border:1px solid var(--border);background:var(--bg);border-radius:var(--radius-ctl);padding:9px 14px;outline:0}& input:focus{border-color:var(--primary)}& form button{width:40px;border:0;border-radius:50%;background:var(--primary);color:var(--on-primary);display:grid;place-items:center;cursor:pointer}`;
add('chat', 'Chat widget', ['chat', 'messaging', 'support', 'widget', 'interactive'], [
  L('Support chat', 'Support chat widget with message bubbles, a send form and an auto-reply.',
    (p) => `<div class="ch"><div class="top">${p.brand} Support</div><div class="msgs"><div class="m th">Hi! How can we help today?</div></div><form><input name="t" placeholder="Type a message…" autocomplete="off" aria-label="Message"><button aria-label="Send">${I.send}</button></form></div>`, CHAT_CSS, CHAT_JS),
  L('Messenger', 'Messenger-style conversation with avatar header and presence dot.',
    (p) => `<div class="ch"><div class="top"><span class="av">${initials(p.name(0))}</span><span>${p.name(0)}<small>● Online</small></span></div><div class="msgs"><div class="m th">Hey! Did you see the new design?</div><div class="m me">Yes, it looks great.</div></div><form><input name="t" placeholder="Message…" autocomplete="off" aria-label="Message"><button aria-label="Send">${I.send}</button></form></div>`,
    `${CHAT_CSS}& .top{display:flex;gap:10px;align-items:center;background:var(--surface);color:var(--text);border-bottom:1px solid var(--border)}& .av{width:36px;height:36px;border-radius:50%;background:${grad};color:var(--on-primary);display:grid;place-items:center;font-size:13px}& small{display:block;color:#1f9d55;font-size:11px;font-weight:600}`, CHAT_JS),
]);

/* 38 ───────── rating */
add('rating', 'Rating', ['rating', 'stars', 'review', 'form', 'interactive', 'a11y'], [
  L('Stars', 'Interactive star rating with hover preview and radio semantics.',
    () => `<div class="rt" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}">${I.star.replace('width="18" height="18"', 'width="30" height="30"')}</button>`).join('')}<span class="v">Rate us</span></div>`,
    `& .rt{display:flex;gap:4px;align-items:center}& .rt button{background:none;border:0;cursor:pointer;color:var(--border);padding:2px;transition:transform .12s}& .rt button.on{color:#f5a524}& .rt button.on svg{fill:currentColor}& .rt button:hover{transform:scale(1.15)}& .v{margin-left:10px;color:var(--muted);font-size:14px}`,
    `const bs = [...root.querySelectorAll('button')], v = root.querySelector('.v'); let cur = 0; const paint = (n) => bs.forEach((b, i) => b.classList.toggle('on', i < n)); bs.forEach((b, i) => { b.addEventListener('mouseenter', () => paint(i + 1)); b.addEventListener('click', () => { cur = i + 1; bs.forEach((x, k) => x.setAttribute('aria-checked', k === i)); v.textContent = cur + ' / 5 — thanks!'; paint(cur); }); }); root.querySelector('.rt').addEventListener('mouseleave', () => paint(cur));`),
  L('Thumbs', 'Helpful-or-not feedback buttons with counters.',
    () => `<div class="fb"><span>Was this helpful?</span><button type="button" data-v="up" aria-pressed="false">👍 <b>24</b></button><button type="button" data-v="dn" aria-pressed="false">👎 <b>3</b></button></div>`,
    `& .fb{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--muted)}& button{display:inline-flex;gap:6px;align-items:center;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-ctl);padding:7px 14px;cursor:pointer;font-weight:600;color:var(--text)}& button[aria-pressed=true]{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 12%,var(--surface))}`,
    `const bs = [...root.querySelectorAll('button')]; bs.forEach((b) => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; bs.forEach((x) => { if (x.getAttribute('aria-pressed') === 'true') { x.setAttribute('aria-pressed', 'false'); x.querySelector('b').textContent = +x.querySelector('b').textContent - 1; } }); if (on) { b.setAttribute('aria-pressed', 'true'); b.querySelector('b').textContent = +b.querySelector('b').textContent + 1; } }));`),
]);

/* 39 ───────── quantity stepper */
add('quantity', 'Quantity stepper', ['stepper', 'counter', 'quantity', 'ecommerce', 'interactive'], [
  L('Counter', 'Plus / minus quantity stepper with min and max limits.',
    () => `<div class="qt"><button type="button" class="m" aria-label="Decrease">${I.minus}</button><output aria-live="polite">1</output><button type="button" class="p" aria-label="Increase">${I.plus}</button></div>`,
    `& .qt{display:inline-flex;align-items:center;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-ctl);overflow:hidden}& button{width:42px;height:42px;border:0;background:none;cursor:pointer;display:grid;place-items:center;color:var(--text)}& button:hover:not([disabled]){background:color-mix(in srgb,var(--primary) 10%,transparent)}& button[disabled]{opacity:.35;cursor:not-allowed}& output{min-width:44px;text-align:center;font-weight:700}`,
    `const o = root.querySelector('output'), m = root.querySelector('.m'), p = root.querySelector('.p'); let n = 1; const set = (k) => { n = Math.max(1, Math.min(10, k)); o.textContent = n; m.disabled = n === 1; p.disabled = n === 10; }; m.addEventListener('click', () => set(n - 1)); p.addEventListener('click', () => set(n + 1)); set(1);`),
  L('Cart line', 'Cart line item with quantity stepper and a live subtotal.',
    (p) => `<div class="ln"><div class="im"></div><div class="in"><b>${p.item(2)}</b><small class="u">$24.00</small></div><div class="qt"><button class="m" aria-label="Decrease">${I.minus}</button><output>1</output><button class="p" aria-label="Increase">${I.plus}</button></div><b class="tot">$24.00</b></div>`,
    `& .ln{display:flex;gap:14px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px var(--pad);flex-wrap:wrap}& .im{width:54px;height:54px;border-radius:calc(var(--radius) - 4px);background:${grad}}& .in{flex:1;display:grid;min-width:100px}& small{color:var(--muted)}& .qt{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:var(--radius-ctl)}& .qt button{width:34px;height:34px;border:0;background:none;cursor:pointer;display:grid;place-items:center;color:var(--text)}& output{min-width:30px;text-align:center;font-weight:700}& .tot{min-width:64px;text-align:right}`,
    `const o = root.querySelector('output'), t = root.querySelector('.tot'); let n = 1; const set = (k) => { n = Math.max(1, Math.min(10, k)); o.textContent = n; t.textContent = '$' + (n * 24).toFixed(2); }; root.querySelector('.m').addEventListener('click', () => set(n - 1)); root.querySelector('.p').addEventListener('click', () => set(n + 1));`),
]);

/* 40 ───────── gallery */
const GAL = [0, 1, 2, 3, 4, 5].map((i) => `<button class="th" style="--h:${i * 60};--r:${[1, 1.3, 0.8, 1.2, 1, 1.4][i]}" aria-label="Open image ${i + 1}"></button>`).join('');
const GAL_JS = `const lb = document.createElement('div'); lb.className = 'dr-lb'; lb.hidden = true; lb.innerHTML = '<div class="dr-lbi"></div><button aria-label="Close" class="dr-lbx">×</button>'; root.appendChild(lb); const im = lb.querySelector('.dr-lbi'); root.querySelectorAll('.th').forEach((t) => t.addEventListener('click', () => { im.style.setProperty('--h', t.style.getPropertyValue('--h')); lb.hidden = false; })); lb.addEventListener('click', () => (lb.hidden = true)); document.addEventListener('keydown', (e) => e.key === 'Escape' && (lb.hidden = true));`;
const GAL_LB = `& .dr-lb{position:fixed;inset:0;background:rgba(0,0,0,.85);display:grid;place-items:center;z-index:80}& .dr-lb[hidden]{display:none}& .dr-lbi{width:min(86vw,560px);aspect-ratio:4/3;border-radius:var(--radius);background:linear-gradient(calc(135deg + var(--h)*1deg),var(--primary),var(--accent))}& .dr-lbx{position:absolute;top:16px;right:20px;font-size:34px;background:none;border:0;color:#fff;cursor:pointer}`;
add('gallery', 'Image gallery', ['gallery', 'images', 'lightbox', 'grid', 'interactive'], [
  L('Grid lightbox', 'Square thumbnail grid that opens a lightbox; Escape or click closes it.',
    () => `<div class="gl">${GAL}</div>`,
    `& .gl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(100%,420px)}& .th{aspect-ratio:1;border:0;border-radius:var(--radius);cursor:zoom-in;background:linear-gradient(calc(135deg + var(--h)*1deg),var(--primary),var(--accent));transition:transform .2s,filter .2s}& .th:hover{transform:scale(1.03);filter:brightness(1.1)}${GAL_LB}`, GAL_JS),
  L('Masonry', 'Pinterest-style masonry columns with a hover overlay and lightbox.',
    () => `<div class="gl">${GAL}</div>`,
    `& .gl{columns:3;column-gap:8px;width:min(100%,440px)}& .th{display:block;width:100%;aspect-ratio:1/var(--r);margin-bottom:8px;border:0;border-radius:var(--radius);cursor:zoom-in;background:linear-gradient(calc(135deg + var(--h)*1deg),var(--primary),var(--accent));position:relative}& .th::after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(0,0,0,.3);opacity:0;transition:opacity .2s}& .th:hover::after{opacity:1}${GAL_LB}`, GAL_JS),
]);

/* 41 ───────── newsletter */
const NL_JS = `const f = root.querySelector('form'), m = root.querySelector('.msg'); f.addEventListener('submit', (e) => { e.preventDefault(); if (/^\\S+@\\S+\\.\\S+$/.test(f.email.value)) { m.textContent = 'You are subscribed. Check your inbox!'; m.className = 'msg ok'; f.reset(); } else { m.textContent = 'Please enter a valid email address.'; m.className = 'msg bad'; } });`;
add('newsletter', 'Newsletter signup', ['newsletter', 'form', 'email', 'subscribe', 'interactive'], [
  L('Inline', 'Inline subscribe form with validation message.',
    (p) => `<div class="nl"><h3>Stay in the loop</h3><p>Monthly tips from the ${p.brand} team. No spam.</p><form novalidate><input name="email" type="email" placeholder="you@example.com" aria-label="Email"><button type="submit">Subscribe</button></form><p class="msg" role="status"></p></div>`,
    `& .nl{max-width:440px;display:grid;gap:8px}& h3{font-size:22px}& p{color:var(--muted)}& form{display:flex;gap:8px;flex-wrap:wrap}& input{flex:1;min-width:160px;border:1.5px solid var(--border);background:var(--surface);border-radius:var(--radius-ctl);padding:12px 16px;outline:0}& input:focus{border-color:var(--primary)}& button{background:var(--primary);color:var(--on-primary);border:0;border-radius:var(--radius-ctl);padding:12px 22px;font-weight:700;cursor:pointer}& .msg{font-size:13px;font-weight:600;min-height:18px}& .ok{color:#1f9d55}& .bad{color:#d64545}`, NL_JS),
  L('Card', 'Boxed newsletter card with an icon header.',
    (p) => `<div class="nl"><span class="ic">${I.mail}</span><h3>Join the newsletter</h3><p>${p.sub}</p><form novalidate><input name="email" type="email" placeholder="Your email" aria-label="Email"><button type="submit">${I.arrow}</button></form><p class="msg" role="status"></p></div>`,
    `& .nl{max-width:340px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:var(--pad);display:grid;gap:8px;text-align:center;justify-items:center}& .ic{width:52px;height:52px;border-radius:50%;background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);display:grid;place-items:center}& h3{font-size:20px}& p{color:var(--muted);font-size:14px}& form{display:flex;width:100%;border:1.5px solid var(--border);border-radius:var(--radius-ctl);overflow:hidden;background:var(--bg)}& input{flex:1;min-width:0;border:0;background:none;padding:11px 14px;outline:0}& button{width:48px;border:0;background:var(--primary);color:var(--on-primary);cursor:pointer;display:grid;place-items:center}& .msg{font-size:13px;font-weight:600;min-height:18px}& .ok{color:#1f9d55}& .bad{color:#d64545}`, NL_JS),
]);

/* 42 ───────── pricing toggle */
add('pricing-toggle', 'Billing toggle', ['pricing', 'toggle', 'billing', 'saas', 'interactive'], [
  L('Monthly / yearly', 'Pricing cards with a monthly/yearly switch that updates prices and shows the saving.',
    () => `<div class="bt"><span class="lb m on">Monthly</span><button class="sw" role="switch" aria-checked="false" aria-label="Billing period"><i></i></button><span class="lb y">Yearly <em>-20%</em></span></div><div class="gr">${[['Starter', 12], ['Pro', 29], ['Team', 59]].map(([n, v]) => `<article class="pl"><h4>${n}</h4><div class="pr"><b data-m="${v}" data-y="${Math.round(v * 0.8)}">$${v}</b><span>/mo</span></div><button type="button">Choose</button></article>`).join('')}</div>`,
    `& .bt{display:flex;gap:12px;align-items:center;justify-content:center;margin-bottom:var(--pad);font-weight:600;color:var(--muted)}& .lb.on{color:var(--text)}& em{font-style:normal;font-size:12px;background:var(--accent);color:var(--bg);border-radius:var(--radius-ctl);padding:2px 8px;margin-left:4px}& .sw{position:relative;width:48px;height:26px;border-radius:13px;border:0;background:var(--border);cursor:pointer}& .sw i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}& .sw[aria-checked=true]{background:var(--primary)}& .sw[aria-checked=true] i{transform:translateX(22px)}& .gr{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--gap)}& .pl{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:var(--pad);display:grid;gap:8px;text-align:center}& .pr b{font-size:30px}& .pr span{color:var(--muted)}& .pl button{background:var(--primary);color:var(--on-primary);border:0;border-radius:var(--radius-ctl);padding:10px;font-weight:700;cursor:pointer}`,
    `const sw = root.querySelector('.sw'); sw.addEventListener('click', () => { const y = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', y); root.querySelector('.m').classList.toggle('on', !y); root.querySelector('.y').classList.toggle('on', y); root.querySelectorAll('.pr b').forEach((b) => (b.textContent = '$' + (y ? b.dataset.y : b.dataset.m))); });`),
]);

export const TEMPLATES_B = T;
