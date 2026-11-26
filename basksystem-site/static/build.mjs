import fs from "node:fs";
import { marked } from "marked";

const site = JSON.parse(fs.readFileSync("site.json", "utf8"));
const has = (p) => fs.existsSync(p);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- dates for the footer (computed at build time, days also refreshed in the browser) ----
const tz = site.timezone || "Asia/Taipei";
const now = new Date();
const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
}).format(now); // e.g. 2026-11-26 14:30
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
  return { meta, html: marked.parse(body) };
}

// Optional pages: they appear in the top-right nav only if the file exists in content/
const pageDefs = [
  { name: "about", label: "About" },
  { name: "thoughts", label: "Thoughts" },
  { name: "work", label: "Work" },
].filter((p) => has(`content/${p.name}.md`));

const FONTS = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=LXGW+WenKai+TC:wght@300;400;700&display=swap";

function page(title, body) {
  const head = has("static/logo.png")
    ? `<a href="/"><img class="logo" src="/static/logo.png" alt="${esc(site.title)}"></a>`
    : `<a class="name" href="/">${esc(site.title)}</a>`;
  const icon = has("static/favicon.png") ? `<link rel="icon" href="/static/favicon.png">` : "";
  const navItems = pageDefs.map((p) => `<a href="/${p.name}.html">${p.label}</a>`);
  if (site.rss) navItems.push(`<a href="/atom.xml">RSS</a>`);
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
<nav>${navItems.join("")}</nav></header>
<main>${body}</main>
<footer><div class="meta">
<p id="days" data-since="${site.since}">Online for ${days} days · since ${site.since}</p>
<p>Last updated ${stamp}</p></div>
<button id="theme" type="button" aria-label="Toggle light / dark"></button></footer>
<script>
(function(){
  var root=document.documentElement,btn=document.getElementById("theme");
  function cur(){return root.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}
  function label(){btn.textContent=cur()==="dark"?"Light":"Dark"}
  btn.addEventListener("click",function(){var n=cur()==="dark"?"light":"dark";root.dataset.theme=n;try{localStorage.setItem("theme",n)}catch(e){}label()});
  label();
  var d=document.getElementById("days"),s=d.dataset.since;
  var n=Math.max(0,Math.floor((Date.now()-Date.parse(s+"T00:00:00+08:00"))/864e5));
  d.textContent="Online for "+n+" days · since "+s;
})();
</script></body></html>`;
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

const byYear = new Map();
for (const p of posts) {
  const y = p.date.slice(0, 4);
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push(p);
}
let list = "";
for (const [y, items] of byYear) {
  list += `<h3>${y}</h3><ul>` + items.map((p) =>
    `<li><a href="/posts/${p.slug}.html">${esc(p.title)}</a> <span class="date">(${p.date.slice(0, 7)})</span></li>`
  ).join("") + `</ul>`;
}
fs.writeFileSync("dist/index.html", page(site.title, `<h2>Posts</h2>${list}`));

for (const { name } of pageDefs) {
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

console.log(`Built ${posts.length} posts, ${pageDefs.length} pages. Footer: ${days} days, ${stamp}.`);
