// --- PWA gate ---
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const gate = document.getElementById("gate");
const app = document.getElementById("app");

if (isStandalone) {
  gate.style.display = "none";
  app.style.display = "block";
} else {
  gate.style.display = "flex";
  app.style.display = "none";
}

// --- SW ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

// --- Small helpers ---
const $ = (id) => document.getElementById(id);
const nowHHMM = () => new Date().toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });

function randHex(n=6){
  const s = "0123456789ABCDEF";
  let out = "";
  for (let i=0;i<n;i++) out += s[Math.floor(Math.random()*s.length)];
  return out;
}

// --- UI init ---
$("clock").textContent = nowHHMM();
setInterval(()=> $("clock").textContent = nowHHMM(), 1000 * 10);

$("sessionId").textContent = `S-${randHex(8)}`;
$("build").textContent = `build ${new Date().toISOString().slice(0,10)}`;

// --- Theme ---
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") document.body.classList.add("light");

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
});

// --- Logs ---
const logEl = $("log");
let logCount = 0;

function log(line){
  const ts = new Date().toLocaleTimeString("uk-UA", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  logEl.textContent += `[${ts}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
  logCount++;
  $("logTag").textContent = `${logCount} записів`;
}

$("clearBtn").addEventListener("click", () => {
  logEl.textContent = "";
  logCount = 0;
  $("logTag").textContent = `0 записів`;
  log("LOG RESET");
});

// --- Fake beep (WebAudio) ---
function beep(freq=880, ms=80){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.04;
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, ms);
  }catch{}
}

// --- Modules state ---
const chips = {
  net: $("mNet"),
  store: $("mStore"),
  intg: $("mInt"),
  ui: $("mUI"),
};

function setChip(el, txt, kind="idle"){
  el.textContent = txt;
  el.style.color = "var(--muted)";
  if (kind === "ok") el.style.color = "var(--ok)";
  if (kind === "warn") el.style.color = "var(--warn)";
  if (kind === "bad") el.style.color = "var(--bad)";
}

// --- Progress ---
let sync = 0;
function setProgress(pct){
  sync = Math.max(0, Math.min(100, pct));
  $("syncPct").textContent = `${sync}%`;
  $("syncBar").style.width = `${sync}%`;
}

// --- Status tags ---
function setStatus(text, kind="idle"){
  const tag = $("statusTag");
  tag.textContent = text;
  tag.classList.remove("ok","warn","bad");
  if (kind === "ok") tag.classList.add("ok");
  if (kind === "warn") tag.classList.add("warn");
  if (kind === "bad") tag.classList.add("bad");
}

function setModulesTag(kind="ok"){
  const t = $("modulesTag");
  t.textContent = kind === "ok" ? "OK" : (kind === "warn" ? "WARN" : "FAIL");
  t.classList.remove("ok","warn","bad");
  t.classList.add(kind);
}

// --- Run check animation ---
let running = false;

$("runBtn").addEventListener("click", async () => {
  if (running) return;
  running = true;

  beep(740, 70);
  log("INIT CHECK");
  setStatus("В процесі…", "warn");

  setModulesTag("warn");
  setChip(chips.net, "pending");
  setChip(chips.store, "pending");
  setChip(chips.intg, "pending");
  setChip(chips.ui, "pending");
  setProgress(0);

  await step("Network handshake", () => setChip(chips.net, "ok", "ok"), 22);
  await step("Storage mount", () => setChip(chips.store, "ok", "ok"), 46);
  await step("Integrity scan", () => setChip(chips.intg, Math.random() < 0.92 ? "ok" : "warn", "ok"), 73);
  await step("UI layer sync", () => setChip(chips.ui, "ok", "ok"), 100);

  const ok = Math.random() < 0.93;
  if (ok){
    setStatus("Підтверджено", "ok");
    setModulesTag("ok");
    log("RESULT: VERIFIED");
    beep(988, 90);
    beep(1318, 70);
  } else {
    setStatus("Потрібна перевірка", "warn");
    setModulesTag("warn");
    log("RESULT: NEED MANUAL REVIEW");
    beep(220, 110);
  }

  running = false;
});

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function step(name, doneFn, targetPct){
  log(name + "…");
  // smooth progress
  while (sync < targetPct) {
    setProgress(sync + 2);
    await sleep(40);
  }
  await sleep(120);
  doneFn();
  log(name + ": OK");
}

// --- Secret menu (hold 3s) ---
let holdTimer = null;
$("holdTarget").addEventListener("pointerdown", () => {
  holdTimer = setTimeout(() => openDrawer(), 3000);
});
["pointerup","pointercancel","pointerleave"].forEach(ev=>{
  $("holdTarget").addEventListener(ev, ()=> clearTimeout(holdTimer));
});

function openDrawer(){
  $("drawer").style.display = "flex";
  $("drawer").setAttribute("aria-hidden","false");
  beep(880, 60);
}
function closeDrawer(){
  $("drawer").style.display = "none";
  $("drawer").setAttribute("aria-hidden","true");
}
$("closeDrawer").addEventListener("click", closeDrawer);
$("drawer").addEventListener("click", (e) => { if (e.target.id === "drawer") closeDrawer(); });

// Apply secret settings
$("applySecret").addEventListener("click", () => {
  const p = $("profileInput").value.trim();
  const m = $("modeSelect").value;

  if (p) $("profileName").textContent = p;
  $("modeName").textContent = m;

  log(`SECRET APPLY: profile=${p || "(unchanged)"} mode=${m}`);
  beep(1046, 70);
  closeDrawer();
});

$("randomize").addEventListener("click", () => {
  const names = ["User", "Operator", "Guest", "Ivan", "Pasha", "Admin"];
  const modes = ["Standard","Beta","Internal","Maintenance"];
  $("profileName").textContent = names[Math.floor(Math.random()*names.length)];
  $("modeName").textContent = modes[Math.floor(Math.random()*modes.length)];
  log("SECRET: randomize");
  beep(660, 70);
});

// --- “anti-screenshot” imitation (blur on app switch) ---
document.addEventListener("visibilitychange", () => {
  if (!isStandalone) return;
  document.body.style.filter = document.hidden ? "blur(10px)" : "none";
  if (document.hidden) log("APP HIDDEN (privacy blur)");
});
