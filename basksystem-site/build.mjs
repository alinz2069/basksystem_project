import fs from "node:fs";
import { marked } from "marked";

const site = JSON.parse(fs.readFileSync("site.json", "utf8"));
const has = (p) => fs.existsSync(p);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

function page(title, body) {
  const head = has("static/logo.png")
    ? `<a href="/"><img class="logo" src="/static/logo.png" alt="${esc(site.title)}"></a>`
    : `<a class="name" href="/">${esc(site.title)}</a>`;
  const icon = has("static/favicon.png") ? `<link rel="icon" href="/static/favicon.png">` : "";
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>${icon}
<link rel="alternate" type="application/atom+xml" href="/atom.xml">
<link rel="stylesheet" href="/static/style.css"></head>
<body><header>${head}
<nav>[<a href="/atom.xml">RSS</a>] [<a href="/about.html">關於</a>] [<a href="/thoughts.html">隨想</a>]</nav></header>
<main>${body}</main>
<footer>${esc(site.footer)}</footer></body></html>`;
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
fs.writeFileSync("dist/index.html", page(site.title, `<h2>文章</h2>${list}`));

for (const name of ["about", "thoughts"]) {
  const { meta, html } = read(`content/${name}.md`);
  const t = meta.title || name;
  fs.writeFileSync(`dist/${name}.html`, page(`${t} - ${site.title}`, `<h2>${esc(t)}</h2>${html}`));
}

const entries = posts.map((p) =>
  `<entry><title>${esc(p.title)}</title><link href="${site.url}/posts/${p.slug}.html"/><id>${site.url}/posts/${p.slug}.html</id><updated>${p.date}T00:00:00Z</updated><content type="html">${esc(p.html)}</content></entry>`
).join("\n");
fs.writeFileSync("dist/atom.xml", `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>${esc(site.title)}</title>
<link href="${site.url}/"/><id>${site.url}/</id><updated>${new Date().toISOString()}</updated>
<author><name>${esc(site.title)}</name></author>
${entries}
</feed>`);

console.log(`Built ${posts.length} posts.`);
