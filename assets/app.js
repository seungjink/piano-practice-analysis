
const app = document.querySelector("#app");
const localMedia = new Map();
const clipStates = new Map();
let clipSeq = 0;
let abToken = 0;

document.addEventListener("DOMContentLoaded", boot);

async function boot(){
  try{
    const params = new URLSearchParams(location.search);
    const report = params.get("report");
    if(report) await renderReport(report);
    else await renderIndex(params.get("showHidden")==="1");
  }catch(err){
    renderError(err);
  }
}

async function renderIndex(showHidden=false){
  const api = "https://api.github.com/repos/seungjink/piano-practice-analysis/contents/reports?ref=main";
  const res = await fetch(api, {cache:"no-store"});
  if(!res.ok) throw new Error("reports 폴더 목록을 불러오지 못했습니다.");

  const files = (await res.json())
    .filter(x => x.type === "file" && x.name.endsWith(".md") && x.name !== "template.md");

  const reports = (await Promise.all(files.map(async file => {
    const rawRes = await fetch(file.download_url, {cache:"no-store"});
    if(!rawRes.ok) return null;
    const raw = await rawRes.text();
    const {meta} = parseFrontmatter(raw);
    return {
      slug: file.name.replace(/\.md$/,""),
      title: meta.title || file.name.replace(/\.md$/,""),
      date: meta.date || "",
      summary: meta.summary || "",
      hidden: meta.hidden === true,
      order: Number(meta.order ?? 9999)
    };
  }))).filter(Boolean);

  reports.sort((a,b) =>
    (a.order-b.order) ||
    String(b.date).localeCompare(String(a.date)) ||
    String(a.title).localeCompare(String(b.title))
  );

  const visible = reports.filter(r => showHidden || !r.hidden);
  app.innerHTML = `
    <section class="paper narrow">
      <div class="hero">
        <h1>Piano Practice Analysis</h1>
        <p>연주 해석, 악보, 영상 구간을 함께 기록한 분석 노트.</p>
      </div>
      <div class="report-list">
        ${visible.length ? visible.map(reportRow).join("") : '<p class="empty">아직 표시할 분석이 없습니다.</p>'}
      </div>
    </section>`;
}

function reportRow(r){
  const date = r.date ? esc(r.date) : "";
  return `
    <article class="report-row">
      <div>
        <h2><a href="?report=${encodeURIComponent(r.slug)}">${esc(r.title || r.slug)}</a></h2>
        ${r.summary ? `<p>${esc(r.summary)}</p>` : ""}
      </div>
      <div class="report-meta">${date}${r.hidden ? " · hidden" : ""}</div>
    </article>`;
}

async function renderReport(slug){
  if(!/^[a-zA-Z0-9._-]+$/.test(slug)) throw new Error("잘못된 report 이름입니다.");
  const res = await fetch(`./reports/${slug}.md`, {cache:"no-store"});
  if(!res.ok) throw new Error(`reports/${slug}.md를 찾을 수 없습니다.`);
  const raw = await res.text();
  const {meta, body} = parseFrontmatter(raw);
  const aliases = collectLocalAliases(body);

  app.innerHTML = `
    <article class="paper">
      <a class="back-link" href="./">← 분석 목록</a>
      <header class="report-header">
        <div class="report-kicker">${meta.date ? esc(meta.date) : "Practice Analysis"}${meta.hidden ? " · Hidden" : ""}</div>
        <h1 class="report-title">${esc(meta.title || slug)}</h1>
        ${meta.summary ? `<p class="report-summary">${esc(meta.summary)}</p>` : ""}
      </header>
      ${aliases.length ? mediaPickerHTML(aliases) : ""}
      <section id="report-body" class="report-body"></section>
    </article>`;

  bindMediaPickers();
  renderMarkdownBody(body);
}

function parseFrontmatter(raw){
  const meta = {};
  if(!raw.startsWith("---\n")) return {meta, body:raw};
  const end = raw.indexOf("\n---", 4);
  if(end < 0) return {meta, body:raw};
  const fm = raw.slice(4,end).split("\n");
  for(const line of fm){
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if(!m) continue;
    let v = m[2].trim();
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    if(v==="true") v=true;
    if(v==="false") v=false;
    meta[m[1]]=v;
  }
  return {meta, body:raw.slice(end+4).replace(/^\s+/, "")};
}

function collectLocalAliases(md){
  const found = new Map();
  const re = /src:\s*local:([A-Za-z0-9._-]+)/g;
  let m;
  while((m=re.exec(md))){
    const alias=m[1];
    const nearby = md.slice(Math.max(0,m.index-80), Math.min(md.length,m.index+120));
    const isImage = /piano-image/.test(nearby);
    found.set(alias, isImage ? "image" : "video");
  }
  return [...found.entries()].map(([alias,type])=>({alias,type}));
}

function mediaPickerHTML(items){
  return `
  <section class="media-picker">
    <h2>로컬 미디어 연결</h2>
    <p>브라우저 보안상 로컬 파일은 페이지를 열 때 직접 선택해야 합니다. 선택한 파일은 업로드되지 않고 현재 브라우저 세션에서만 사용됩니다.</p>
    ${items.map(x=>`
      <div class="media-row">
        <label for="local-${esc(x.alias)}">${esc(x.alias)}</label>
        <input id="local-${esc(x.alias)}" data-local-alias="${esc(x.alias)}" type="file" accept="${x.type==="image" ? "image/*" : "video/*"}">
      </div>`).join("")}
  </section>`;
}

function bindMediaPickers(){
  document.querySelectorAll("[data-local-alias]").forEach(input=>{
    input.addEventListener("change", e=>{
      const file=e.target.files?.[0];
      if(!file) return;
      const alias=input.dataset.localAlias;
      const old=localMedia.get(alias);
      if(old?.url) URL.revokeObjectURL(old.url);
      localMedia.set(alias,{file,url:URL.createObjectURL(file)});
      refreshLocalAlias(alias);
    });
  });
}

function refreshLocalAlias(alias){
  document.querySelectorAll(`[data-await-local="${cssEsc(alias)}"]`).forEach(node=>{
    if(node.dataset.kind==="image"){
      const info=localMedia.get(alias);
      if(info){
        const img=document.createElement("img");
        img.src=info.url;
        img.alt=node.dataset.alt || "";
        node.replaceWith(img);
      }
    }
  });
  document.querySelectorAll(`.clip-card[data-local-alias="${cssEsc(alias)}"]`).forEach(card=>{
    const st=clipStates.get(card.id);
    if(st) setVideoSource(st, resolveSrc("local:"+alias));
  });
}

function renderMarkdownBody(md){
  clipSeq=0;
  clipStates.clear();
  const blocks=[];
  md = md.replace(/```(piano-video|piano-compare|piano-image)\n([\s\S]*?)```/g,(all,type,body)=>{
    const token=`@@PIANO_BLOCK_${blocks.length}@@`;
    blocks.push({type,body});
    return "\n"+token+"\n";
  });

  let html;
  if(window.marked){
    html=marked.parse(md);
  }else{
    html=basicMarkdown(md);
  }
  blocks.forEach((b,i)=>{
    html=html.replace(`<p>@@PIANO_BLOCK_${i}@@</p>`, customBlockHTML(b));
    html=html.replace(`@@PIANO_BLOCK_${i}@@`, customBlockHTML(b));
  });
  document.querySelector("#report-body").innerHTML=html;
  initClips();
}

function customBlockHTML(block){
  if(block.type==="piano-image"){
    const o=parseKV(block.body);
    const src=resolveSrc(o.src||"");
    const cap=o.caption||"";
    const alt=o.alt||cap||"Score image";
    const image = src ? `<img src="${escAttr(src)}" alt="${escAttr(alt)}">`
      : localAlias(o.src) ? `<div class="missing-media" data-kind="image" data-await-local="${escAttr(localAlias(o.src))}" data-alt="${escAttr(alt)}">로컬 이미지 “${esc(localAlias(o.src))}”를 선택하세요.</div>`
      : '<div class="missing-media">이미지 소스가 없습니다.</div>';
    return `<figure class="score-figure">${image}${cap?`<figcaption>${esc(cap)}</figcaption>`:""}</figure>`;
  }

  if(block.type==="piano-video"){
    const o=parseKV(block.body);
    const r=parseRange(o.range);
    return clipHTML("clip-"+clipSeq++,o.src,o.label||"Video",r.start,r.end);
  }

  const c=parseCompare(block.body);
  const ra=parseRange(c.a.range), rb=parseRange(c.b.range);
  const a="clip-"+clipSeq++, b="clip-"+clipSeq++;
  return `
    <section class="compare-card">
      <div class="compare-grid">
        ${clipHTML(a,c.a.src,c.a.label||"A",ra.start,ra.end)}
        ${clipHTML(b,c.b.src,c.b.label||"B",rb.start,rb.end)}
      </div>
      <div class="compare-actions">
        <button data-ab="${a}|${b}">A → B</button>
        <button data-loopab="${a}|${b}">A ↔ B Loop</button>
        <button data-stopab>Stop</button>
      </div>
    </section>`;
}

function clipHTML(id,src,label,start,end){
  const dur=Math.max(0,end-start);
  const alias=localAlias(src);
  return `
  <section class="clip-card" id="${id}" data-src="${escAttr(src||"")}" ${alias?`data-local-alias="${escAttr(alias)}"`:""} data-start="${start}" data-end="${end}">
    <div class="clip-head">
      <span class="clip-label">${esc(label)}</span>
      <span class="clip-meta">0:00–${fmt(dur)}</span>
    </div>
    <div class="video-wrap"><video preload="metadata" playsinline></video></div>
    <div class="clip-controls">
      <input class="timebar" type="range" min="0" max="${dur}" step="0.01" value="0">
      <div class="control-row">
        <button class="jump" data-d="-2">−2s</button>
        <button class="jump" data-d="-0.5">−0.5s</button>
        <button class="play">▶</button>
        <button class="jump" data-d="0.5">+0.5s</button>
        <button class="jump" data-d="2">+2s</button>
        <button class="loop">Loop</button>
        <select class="speed"><option>.5×</option><option>.75×</option><option selected>1×</option><option>1.25×</option></select>
        <span class="time-text">0:00.00 / ${fmt(dur)}</span>
      </div>
    </div>
  </section>`;
}

function initClips(){
  document.querySelectorAll(".clip-card").forEach(card=>{
    const video=card.querySelector("video");
    const st={
      card, video,
      start:Number(card.dataset.start),
      end:Number(card.dataset.end),
      dur:Number(card.dataset.end)-Number(card.dataset.start),
      bar:card.querySelector(".timebar"),
      time:card.querySelector(".time-text"),
      loop:false
    };
    clipStates.set(card.id,st);
    setVideoSource(st, resolveSrc(card.dataset.src));

    video.addEventListener("timeupdate",()=>{
      if(video.currentTime>=st.end){
        if(st.loop){video.currentTime=st.start; video.play();}
        else {video.pause(); video.currentTime=st.end;}
      }
      if(video.currentTime<st.start) video.currentTime=st.start;
      updateTime(st);
    });
    video.addEventListener("loadedmetadata",()=>{
      video.currentTime=Math.min(st.start,Math.max(0,video.duration-.05));
      updateTime(st);
    });
    card.querySelector(".play").onclick=()=>{
      if(video.paused){if(video.currentTime>=st.end-.02) video.currentTime=st.start; video.play();}
      else video.pause();
    };
    card.querySelectorAll(".jump").forEach(btn=>btn.onclick=()=>{
      const local=clamp(video.currentTime-st.start+Number(btn.dataset.d),0,st.dur);
      video.currentTime=st.start+local;
      updateTime(st);
    });
    card.querySelector(".loop").onclick=e=>{
      st.loop=!st.loop;
      e.currentTarget.textContent=st.loop?"Loop ✓":"Loop";
    };
    card.querySelector(".speed").onchange=e=>video.playbackRate=parseFloat(e.target.value)||1;
    st.bar.oninput=e=>{
      video.currentTime=st.start+Number(e.target.value);
      updateTime(st);
    };
  });

  document.querySelectorAll("[data-ab]").forEach(b=>b.onclick=()=>playAB(b.dataset.ab,false));
  document.querySelectorAll("[data-loopab]").forEach(b=>b.onclick=()=>playAB(b.dataset.loopab,true));
  document.querySelectorAll("[data-stopab]").forEach(b=>b.onclick=stopAB);
}

function setVideoSource(st,src){
  if(!src){
    st.video.removeAttribute("src");
    st.video.load();
    return;
  }
  st.video.src=src;
  st.video.load();
}

function resolveSrc(src){
  if(!src) return "";
  const alias=localAlias(src);
  if(alias) return localMedia.get(alias)?.url || "";
  return src;
}
function localAlias(src){
  const m=String(src||"").match(/^local:([A-Za-z0-9._-]+)$/);
  return m?m[1]:"";
}

async function playAB(pair,loop){
  stopAB();
  const token=abToken;
  const [a,b]=pair.split("|").map(x=>clipStates.get(x));
  if(!a||!b||!a.video.src||!b.video.src) return;
  do{
    await playOne(a,token); if(token!==abToken) return;
    await sleep(250); if(token!==abToken) return;
    await playOne(b,token); if(token!==abToken) return;
    if(loop) await sleep(250);
  }while(loop && token===abToken);
}
function stopAB(){abToken++; clipStates.forEach(s=>s.video.pause())}
function playOne(st,token){
  return new Promise(resolve=>{
    st.video.currentTime=st.start;
    st.video.play().catch(()=>resolve());
    const tick=()=>{
      if(token!==abToken || st.video.paused || st.video.currentTime>=st.end-.03){st.video.pause();resolve();return;}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function updateTime(st){
  const local=clamp(st.video.currentTime-st.start,0,st.dur);
  st.bar.value=local;
  st.time.textContent=`${fmt(local)} / ${fmt(st.dur)}`;
}
function parseKV(body){
  const o={};
  body.split("\n").forEach(line=>{
    const m=line.match(/^\s*([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if(m)o[m[1]]=m[2];
  });
  return o;
}
function parseCompare(body){
  const o={a:{},b:{}}; let cur=null;
  body.split("\n").forEach(line=>{
    if(/^\s*a:\s*$/.test(line))cur="a";
    else if(/^\s*b:\s*$/.test(line))cur="b";
    else{
      const m=line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
      if(m&&cur)o[cur][m[1]]=m[2];
    }
  });
  return o;
}
function parseRange(s){
  const m=String(s||"0-5").match(/^\s*([0-9.]+)\s*-\s*([0-9.]+)\s*$/);
  return m?{start:Number(m[1]),end:Number(m[2])}:{start:0,end:5};
}
function basicMarkdown(md){
  return md
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .split(/\n{2,}/).map(x=>/^<h/.test(x)||x.startsWith("@@")?x:`<p>${x.replace(/\n/g,"<br>")}</p>`).join("\n");
}
function fmt(s){s=Math.max(0,s||0);const m=Math.floor(s/60),sec=s-m*60;return `${m}:${sec.toFixed(2).padStart(5,"0")}`}
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escAttr(s){return esc(s)}
function cssEsc(s){return window.CSS?.escape?CSS.escape(s):String(s).replace(/[^A-Za-z0-9_-]/g,"\\$&")}
function renderError(err){
  const t=document.querySelector("#error-template").content.cloneNode(true);
  t.querySelector(".error-message").textContent=err?.message||String(err);
  app.replaceChildren(t);
}
