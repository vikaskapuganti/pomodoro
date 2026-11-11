// Pomodoro Focus Timer
// The timer stores an end timestamp, so it stays correct even if the tab sleeps.
// Data lives in localStorage on this device only.

const STORAGE_KEY = "pomodoro-v1";
const LABELS = { focus: "Time to focus", short: "Short break", long: "Long break" };
const R = 54, CIRC = 2 * Math.PI * R;

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

let data = load();
// data = { settings: {...}, sessions: [{ date: "YYYY-MM-DD", end: ms, minutes, task }], round: n }

let mode = "focus";
let running = false;
let endAt = 0;          // timestamp when the current timer ends (while running)
let remaining = 0;      // ms left (while paused)
let tick = null;

// ---------- Storage ----------
function load() {
  const base = { settings: { focus: 25, short: 5, long: 15, every: 4, auto: false, sound: true, notify: false }, sessions: [], round: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && Array.isArray(s.sessions)) return { ...base, ...s, settings: { ...base.settings, ...s.settings } };
  } catch (e) {}
  return base;
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {} }

const durationMs = m => data.settings[m] * 60 * 1000;

// ---------- Timer ----------
function setMode(m, autoStart = false) {
  mode = m;
  running = false;
  clearInterval(tick);
  remaining = durationMs(m);
  document.body.classList.toggle("on-break", m !== "focus");
  if (autoStart) start(); else render();
}

function start() {
  if (running) return;
  if (remaining <= 0) remaining = durationMs(mode);
  endAt = Date.now() + remaining;
  running = true;
  unlockAudio();
  clearInterval(tick);
  tick = setInterval(update, 250);
  render();
}

function pause() {
  if (!running) return;
  remaining = Math.max(0, endAt - Date.now());
  running = false;
  clearInterval(tick);
  render();
}

function update() {
  if (running && Date.now() >= endAt) { complete(); return; }
  renderClock();
}

function complete() {
  clearInterval(tick);
  running = false;
  remaining = 0;
  alertDone();
  if (mode === "focus") {
    const now = new Date();
    data.sessions.push({ date: dayKey(now), end: now.getTime(), minutes: data.settings.focus, task: $("task").value.trim() });
    data.round = (data.round || 0) + 1;
    save();
    const next = data.round % data.settings.every === 0 ? "long" : "short";
    setMode(next, data.settings.auto);
  } else {
    if (mode === "long") { data.round = 0; save(); }
    setMode("focus", data.settings.auto);
  }
  renderStats();
}

function skip() {
  // Skipping never counts as a finished session.
  if (mode === "focus") {
    const next = ((data.round || 0) + 1) % data.settings.every === 0 ? "long" : "short";
    setMode(next);
  } else {
    if (mode === "long") { data.round = 0; save(); }
    setMode("focus");
  }
}

// ---------- Sound and notification ----------
let audioCtx = null;
function unlockAudio() {
  // Browsers only allow sound after a tap, so we prepare it when Start is pressed.
  if (!data.settings.sound) return;
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) {}
}
function chime() {
  if (!data.settings.sound || !audioCtx) return;
  const t = audioCtx.currentTime;
  [660, 880, 990].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.22);
    g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.22 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.5);
    o.connect(g).connect(audioCtx.destination);
    o.start(t + i * 0.22); o.stop(t + i * 0.22 + 0.55);
  });
}
function alertDone() {
  chime();
  if (data.settings.notify && "Notification" in window && Notification.permission === "granted") {
    try { new Notification(mode === "focus" ? "Focus session done. Take a break!" : "Break over. Back to focus!"); } catch (e) {}
  }
}

// ---------- Rendering ----------
function fmt(ms) {
  const s = Math.ceil(ms / 1000);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function renderClock() {
  const left = running ? Math.max(0, endAt - Date.now()) : remaining;
  const total = durationMs(mode);
  $("clock").textContent = fmt(left);
  $("prog").style.strokeDashoffset = String(CIRC * (1 - left / total));
  document.title = running ? `${fmt(left)} · ${mode === "focus" ? "Focus" : "Break"}` : "Pomodoro Focus Timer";
}

function render() {
  document.querySelectorAll(".mode").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === mode));
  $("phase").textContent = LABELS[mode];
  $("startBtn").textContent = running ? "Pause" : (remaining < durationMs(mode) ? "Resume" : "Start");
  const every = data.settings.every, done = (data.round || 0) % every;
  $("dots").innerHTML = Array.from({ length: every }, (_, i) => `<span class="${i < done ? "on" : ""}"></span>`).join("");
  renderClock();
}

function renderStats() {
  const today = new Date();
  const tk = dayKey(today);
  const todays = data.sessions.filter(s => s.date === tk);
  const mins = Math.round(todays.reduce((a, s) => a + s.minutes, 0));
  $("todayMin").textContent = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  $("todayCount").textContent = todays.length;

  // Day streak: consecutive days with at least one session, ending today (or yesterday if none yet today).
  const days = new Set(data.sessions.map(s => s.date));
  let d = days.has(tk) ? today : addDays(today, -1), streak = 0;
  while (days.has(dayKey(d))) { streak++; d = addDays(d, -1); }
  $("streak").textContent = streak;

  // 7-day chart
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const day = addDays(today, -i), k = dayKey(day);
    week.push({ label: i === 0 ? "Today" : day.toLocaleDateString(undefined, { weekday: "short" }), mins: data.sessions.filter(s => s.date === k).reduce((a, s) => a + s.minutes, 0), today: i === 0 });
  }
  const max = Math.max(60, ...week.map(w => w.mins));
  const H = 140, top = 16, bottom = 22, slot = 50, bw = 30;
  $("week").innerHTML = week.map((w, i) => {
    const h = (w.mins / max) * (H - top - bottom);
    const x = i * slot + (slot - bw) / 2, y = H - bottom - h;
    return `<rect class="b ${w.today ? "today" : "past"}" x="${x}" y="${y}" width="${bw}" height="${Math.max(h, w.mins ? 2 : 0)}" rx="5"></rect>` +
      (w.mins ? `<text class="val" x="${x + bw / 2}" y="${y - 4}" text-anchor="middle">${w.mins}</text>` : "") +
      `<text class="lab" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${w.label}</text>`;
  }).join("");
  const wk = Math.round(week.reduce((a, w) => a + w.mins, 0));
  $("weekTotal").textContent = wk ? `${Math.floor(wk / 60)}h ${wk % 60}m of focus this week. Bars show minutes per day.` : "Your week will fill up as you finish sessions.";

  // Log
  $("emptyLog").hidden = todays.length > 0;
  $("log").innerHTML = [...todays].reverse().map(s => {
    const t = new Date(s.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const name = (s.task || "Focus session").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    return `<div class="log-row"><span class="n">${name}</span><span>${s.minutes} min</span><span class="t">${t}</span></div>`;
  }).join("");
}

// ---------- Settings ----------
const fields = { setFocus: "focus", setShort: "short", setLong: "long", setEvery: "every" };
const limits = { focus: [1, 120], short: [1, 60], long: [1, 60], every: [2, 10] };
for (const [id, key] of Object.entries(fields)) {
  const el = $(id);
  el.value = data.settings[key];
  el.addEventListener("change", () => {
    const [lo, hi] = limits[key];
    const v = Math.min(hi, Math.max(lo, Math.round(Number(el.value) || data.settings[key])));
    el.value = v; data.settings[key] = v; save();
    if (!running) setMode(mode); else render();
  });
}
for (const [id, key] of [["setAuto", "auto"], ["setSound", "sound"], ["setNotify", "notify"]]) {
  const el = $(id);
  el.checked = !!data.settings[key];
  el.addEventListener("change", async () => {
    data.settings[key] = el.checked;
    if (key === "notify" && el.checked && "Notification" in window && Notification.permission !== "granted") {
      const p = await Notification.requestPermission();
      if (p !== "granted") { el.checked = false; data.settings.notify = false; alert("Notifications are blocked in your browser settings for this site."); }
    }
    save();
  });
}

// ---------- Controls ----------
$("startBtn").addEventListener("click", () => running ? pause() : start());
$("resetBtn").addEventListener("click", () => setMode(mode));
$("skipBtn").addEventListener("click", skip);
document.querySelectorAll(".mode").forEach(b => b.addEventListener("click", () => {
  if (running && !confirm("Switch timers? The current one will stop.")) return;
  setMode(b.dataset.mode);
}));
document.addEventListener("keydown", e => {
  if (e.code === "Space" && !["INPUT", "TEXTAREA", "SUMMARY"].includes(document.activeElement.tagName)) { e.preventDefault(); running ? pause() : start(); }
});
// Catch up immediately when the user comes back to the tab.
document.addEventListener("visibilitychange", () => { if (!document.hidden) { update(); renderStats(); } });

// ---------- Start ----------
$("prog").style.strokeDasharray = String(CIRC);
setMode("focus");
renderStats();
