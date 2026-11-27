import fs from "node:fs";
import { marked } from "marked";

const site = JSON.parse(fs.readFileSync("site.json", "utf8"));
const has = (p) => fs.existsSync(p);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- dates for the footer (computed at build time, days also refreshed in the browser) ----
const tz = site.timezone || "Asia/Taipei";
const now = new Date();
const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
}).format(now); // e.g. 2026-11-27
const y0 = String(site.since || stamp).slice(0, 4), y1 = stamp.slice(0, 4);
const yr = y0 === y1 ? y1 : `${y0}\u2013${y1}`;
const sinceMs = Date.parse(`${site.since}T00:00:00+08:00`);
const days = Math.max(0, Math.floor((now.getTime() - sinceMs) / 86400000));

function read(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (m) {
    body = m[2];
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { meta, body, html: marked.parse(body) };
}

// Optional pages: they appear in the top-right nav only if the file exists in content/
const pageDefs = [
  { name: "about", label: "About" },
  { name: "thoughts", label: "Thoughts" },
  { name: "work", label: "Work" },
].filter((p) => has(`content/${p.name}.md`));

const FONTS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=LXGW+WenKai+TC:wght@300;400;700&display=swap";


const ICONS = {
  github: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>`,
  telegram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
};
const SOCIAL_LABEL = { github: "GitHub", x: "X", telegram: "Telegram" };

function page(title, body, script = "") {
  const head = has("static/logo.png")
    ? `<a href="/"><img class="logo" src="/static/logo.png" alt="${esc(site.title)}"></a>`
    : `<a class="name" href="/">${esc(site.title)}</a>`;
  const icon = has("static/favicon.png") ? `<link rel="icon" href="/static/favicon.png">` : "";
  const navItems = pageDefs.map((p) => `<a href="/${p.name}.html">${p.label}</a>`);
  if (site.rss) navItems.push(`<a href="/atom.xml">RSS</a>`);
  const social = Object.entries(site.links || {}).filter(([, u]) => u && true)
    .map(([k, u]) => ICONS[k] ? `<a class="ico" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${SOCIAL_LABEL[k]}">${ICONS[k]}</a>` : "").join("");
  const rssLink = site.rss ? `<link rel="alternate" type="application/atom+xml" href="/atom.xml">` : "";
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>${icon}${rssLink}
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/static/style.css"></head>
<body><header>${head}
<nav>${navItems.join("")}${social}</nav></header>
<main>${body}</main>
<footer><p class="meta">\u00A9${yr} ${esc(site.author || "")}<span class="sep">|</span>Last updated ${stamp}</p>
<button id="theme" type="button" aria-label="Toggle light / dark"></button></footer>
<script>
(function(){
  var root=document.documentElement,btn=document.getElementById("theme");
  function cur(){return root.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}
  var MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2.5M12 20v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M1.5 12H4M20 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>';
  function label(){btn.innerHTML=cur()==="dark"?SUN:MOON}
  btn.addEventListener("click",function(){var n=cur()==="dark"?"light":"dark";root.dataset.theme=n;try{localStorage.setItem("theme",n)}catch(e){}label()});
  label();
})();
</script>${script}</body></html>`;
}

fs.rmSync("dist", { recursive: true, force: true });
fs.mkdirSync("dist/posts", { recursive: true });
fs.cpSync("static", "dist/static", { recursive: true });

const posts = fs.readdirSync("content/posts")
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const { meta, html } = read("content/posts/" + f);
    const slug = f.replace(/\.md$/, "");
    return { slug, date: meta.date || "1970-01-01", title: meta.title || slug, html };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

for (const p of posts) {
  fs.writeFileSync(`dist/posts/${p.slug}.html`, page(`${p.title} - ${site.title}`,
    `<article><h2>${esc(p.title)}</h2><p class="date">${p.date}</p>${p.html}</article>`));
}

const list = `<ul class="posts">` + posts.map((p) =>
  `<li><a href="/posts/${p.slug}.html">${esc(p.title)}</a><span class="pdate">${p.date}</span></li>`
).join("") + `</ul>`;
fs.writeFileSync("dist/index.html", page(site.title, `<h2>Posts</h2>${list}`));


function renderThoughts() {
  const { meta, body } = read("content/thoughts.md");
  const intro = meta.intro || "";
  const entries = [];
  let cur = null;
  for (const line of body.split("\n")) {
    const m = line.match(/^\[(\d{4}-\d{2}-\d{2})(?: (\d{1,2}:\d{2}))?\]\s*$/);
    if (m) { cur = { date: m[1], time: m[2] ? m[2].padStart(5, "0") : "", lines: [] }; entries.push(cur); }
    else if (cur) cur.lines.push(line);
  }
  entries.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const years = [...new Set(entries.map((e) => e.date.slice(0, 4)))];
  const tabs = `<div class="tabs"><button type="button" data-y="all" class="on">All</button>` +
    years.map((y) => `<button type="button" data-y="${y}">${y}</button>`).join("") + `</div>`;
  const items = entries.map((e) =>
    `<article class="t" data-year="${e.date.slice(0, 4)}"><div class="tb">${marked.parse(e.lines.join("\n").trim(), { breaks: true })}</div><time>${e.date}${e.time ? " " + e.time : ""}</time></article>`
  ).join("");
  const script = `<script>
(function(){
  var bs=document.querySelectorAll(".tabs button"),ts=document.querySelectorAll(".t");
  function show(y){bs.forEach(function(b){b.classList.toggle("on",b.dataset.y===y)});ts.forEach(function(t){t.hidden=!(y==="all"||t.dataset.year===y)})}
  bs.forEach(function(b){b.addEventListener("click",function(){show(b.dataset.y);history.replaceState(null,"",b.dataset.y==="all"?location.pathname:"#"+b.dataset.y)})});
  var h=location.hash.slice(1);if(h&&document.querySelector('.tabs button[data-y="'+h+'"]'))show(h);
})();
</script>`;
  const html = `<h2>${esc(meta.title || "Thoughts")}</h2>` +
    (intro ? `<div class="intro"><span class="qmark" aria-hidden="true">\u201C</span><p>${esc(intro)}</p></div>` : "") +
    tabs + `<section class="thoughts">${items}</section>`;
  fs.writeFileSync("dist/thoughts.html", page(`${meta.title || "Thoughts"} - ${site.title}`, html, script));
}

for (const { name } of pageDefs) {
  if (name === "thoughts") { renderThoughts(); continue; }
  const { meta, html } = read(`content/${name}.md`);
  const t = meta.title || name;
  fs.writeFileSync(`dist/${name}.html`, page(`${t} - ${site.title}`, `<h2>${esc(t)}</h2>${html}`));
}

if (site.rss) {
  const entries = posts.map((p) =>
    `<entry><title>${esc(p.title)}</title><link href="${site.url}/posts/${p.slug}.html"/><id>${site.url}/posts/${p.slug}.html</id><updated>${p.date}T00:00:00Z</updated><content type="html">${esc(p.html)}</content></entry>`
  ).join("\n");
  fs.writeFileSync("dist/atom.xml", `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>${esc(site.title)}</title>
<link href="${site.url}/"/><id>${site.url}/</id><updated>${now.toISOString()}</updated>
<author><name>${esc(site.title)}</name></author>
${entries}
</feed>`);
}

console.log(`Built ${posts.length} posts, ${pageDefs.length} pages. Footer: \u00A9${yr}, ${stamp}.`);
