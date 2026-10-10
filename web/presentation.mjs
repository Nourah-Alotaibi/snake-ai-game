// Create presentation controls when using the standard lab layout.
if (!document.getElementById('stage')) {
  const wrapper=document.createElement('div');wrapper.id='stage';
  const workspace=document.querySelector('.workspace');workspace.before(wrapper);wrapper.append(workspace);
}
if (!document.getElementById('present')) {
  const button=document.createElement('button');button.id='present';button.type='button';button.textContent='Present the lab';button.setAttribute('aria-pressed','false');document.querySelector('header nav').append(button);
}
if (!document.getElementById('tour-caption')) {
  const footer=document.createElement('div');footer.id='tour-caption';footer.className='tour-caption';footer.hidden=true;
  footer.innerHTML='<p id="tour-text"></p><div class="tour-buttons"><button id="tour-pause" type="button">Pause tour</button><button id="tour-exit" type="button">Exit presentation</button></div>';document.body.append(footer);
}
const presentationStyle=document.createElement('style');presentationStyle.textContent=`
#stage { transform-origin:0 0; }
body.presenting { overflow:hidden; }
body.presenting header,body.presenting .intro,body.presenting #status,body.presenting .deep-learning { display:none; }
body.presenting main { max-width:none;padding:0; }
body.presenting .panel-move-controls,body.presenting .panel-order-reset { display:none!important; }
body.presenting .board-panel { margin-top:0!important; }
body.presenting .workspace { grid-template-columns:minmax(0,1fr) 440px minmax(0,1fr);gap:16px; }
body.presenting .workspace>.network-panel { grid-column:1 / -1;grid-row:2;width:100%;max-width:none; }
body.presenting .workspace>.network-panel .interactive-network { max-width:850px;margin:auto; }
body.tour-motion #stage { transition:transform 2.5s cubic-bezier(.45,.05,.25,1); }
.tour-caption { position:fixed;right:0;bottom:0;left:0;z-index:100;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-top:1px solid var(--line);background:var(--panel); }
.tour-caption[hidden] { display:none; }
.tour-caption p { margin:0;font-size:16px;color:var(--ink); }
.tour-buttons { display:flex;gap:8px; }
@media(prefers-reduced-motion:reduce){body.tour-motion #stage{transition:none;}}
`;document.head.append(presentationStyle);
const tourNetwork=document.querySelector('.network-panel');
const tourAnchor=document.createComment('Network placement before presentation');
// Presentation mode: a timed tour of the dashboard. It moves the stage only; saved layouts and training are untouched.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const startButton = $('present');
const caption = $('tour-caption');
const captionText = $('tour-text');
const pauseButton = $('tour-pause');
const exitButton = $('tour-exit');

const MARGIN = 24;
const CAPTION_HEIGHT = 96;
const TRANSITION = 2500;
const HOLD = 3000;
const PAUSE = 4500;
const MAX_SCALE = 1.9;

const STEPS = [
  { overview: true, text: 'The whole lab on one screen: the game, learning settings, explanations and the network.' },
  { target: '.board-panel', text: 'The game: watch the snake play, pause it, or take a single move.' },
  { target: '.controls-column', text: 'Learning settings: change a value, then apply it to start a fresh brain.' },
  { target: '.play-column > .panel:not(.score-details)', text: 'Why this turn? SHAP bars show which signals favor the preferred move over its runner-up.' },
  { target: '.score-details', text: 'Move scores: the expected reward for each move, not a probability.' },
  { target: '.network-row', text: 'The network: 11 signals flow through two hidden layers to three move scores.' },
  { overview: true, text: 'Back to the full dashboard. Exit the presentation whenever you like.' },
];

let active = false;
let paused = false;
let runId = 0;
let current = { tx: 0, ty: 0, s: 1 };

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function wait(ms, id) {
  let left = ms;
  let last = performance.now();
  while (left > 0 && id === runId) {
    await sleep(30);
    const now = performance.now();
    if (!paused) left -= now - last;
    last = now;
  }
  return id === runId;
}

function layoutBox(el) {
  const s0 = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const { tx, ty, s } = current;
  return {
    L: s0.left - tx,
    T: s0.top - ty,
    x: (r.left - s0.left) / s,
    y: (r.top - s0.top) / s,
    w: r.width / s,
    h: r.height / s,
  };
}

function area() {
  const w = window.innerWidth - MARGIN * 2;
  const h = window.innerHeight - CAPTION_HEIGHT - MARGIN * 2;
  return { w, h, centerY: MARGIN + h / 2 };
}

function apply(tx, ty, s) {
  current = { tx, ty, s };
  stage.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
}

function snapTo(tx, ty, s) {
  stage.style.transition = 'none';
  apply(tx, ty, s);
  void stage.offsetWidth;
  stage.style.transition = '';
}

function overviewPlan() {
  const base = layoutBox(stage);
  const box = area();
  const s = Math.min(box.w / base.w, box.h / base.h, 1);
  return {
    tx: window.innerWidth / 2 - base.L - s * (base.w / 2),
    ty: box.centerY - base.T - s * (base.h / 2),
    s,
  };
}

function targetPlan(el) {
  const base = layoutBox(stage);
  const b = layoutBox(el);
  const box = area();
  const widthFit = Math.min(box.w / b.w, MAX_SCALE);
  const tall = b.h * widthFit > box.h + 2;
  const s = tall ? widthFit : Math.min(widthFit, box.h / b.h);
  const half = box.h / (2 * s);
  const cx = b.x + b.w / 2;
  const cyTop = b.y + half;
  const cyBottom = b.y + b.h - half;
  const cyStart = tall ? cyTop : b.y + b.h / 2;
  const yFor = (cy) => box.centerY - base.T - s * cy;
  return { s, tall, cyTop, cyBottom, tx: window.innerWidth / 2 - base.L - s * cx, yFor, cyStart };
}

async function gentleScroll(plan, id) {
  stage.style.transition = 'none';
  let progress = 0;
  let last = performance.now();
  while (progress < PAUSE && id === runId) {
    await nextFrame();
    const now = performance.now();
    if (!paused) progress += now - last;
    last = now;
    const k = Math.min(1, progress / PAUSE);
    const eased = k * k * (3 - 2 * k);
    apply(plan.tx, plan.yFor(plan.cyTop + (plan.cyBottom - plan.cyTop) * eased), plan.s);
  }
  stage.style.transition = '';
  return id === runId;
}

async function runTour(id) {
  for (let i = 0; i < STEPS.length; i += 1) {
    if (id !== runId) return;
    const step = STEPS[i];
    captionText.textContent = step.text;
    if (step.overview) {
      if (i > 0) {
        const plan = overviewPlan();
        apply(plan.tx, plan.ty, plan.s);
        if (!(await wait(reduced.matches ? 0 : TRANSITION, id))) return;
      }
      if (!(await wait(HOLD, id))) return;
    } else {
      const el = document.querySelector(step.target);
      if (!el) continue;
      const plan = targetPlan(el);
      apply(plan.tx, plan.yFor(plan.cyStart), plan.s);
      if (!(await wait(reduced.matches ? 0 : TRANSITION, id))) return;
      if (plan.tall && !reduced.matches) {
        if (!(await gentleScroll(plan, id))) return;
      } else if (!(await wait(PAUSE, id))) return;
    }
  }
}

async function start() {
  if (active) return;
  active = true;
  const id = ++runId;
  paused = false;
  pauseButton.textContent = 'Pause tour';
  tourNetwork.before(tourAnchor);
  tourNetwork.classList.add('network-row');
  document.querySelector('.workspace').append(tourNetwork);
  document.body.classList.add('presenting');
  document.body.classList.toggle('tour-motion', !reduced.matches);
  caption.hidden = false;
  startButton.textContent = 'Stop presentation';
  startButton.setAttribute('aria-pressed', 'true');
  window.scrollTo({ top: 0, behavior: 'instant' });
  stage.style.transform = '';
  current = { tx: 0, ty: 0, s: 1 };
  let mode = 'in this window';
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      if (document.fullscreenElement) mode = 'full screen';
    }
  } catch {
    mode = 'in this window';
  }
  document.body.dataset.presentation = mode;
  await nextFrame();
  await sleep(250);
  if (id !== runId) return;
  const plan = overviewPlan();
  snapTo(plan.tx, plan.ty, plan.s);
  runTour(id);
}

async function stop() {
  if (!active) return;
  active = false;
  runId += 1;
  paused = false;
  stage.style.transition = 'none';
  stage.style.transform = '';
  void stage.offsetWidth;
  stage.style.transition = '';
  current = { tx: 0, ty: 0, s: 1 };
  tourAnchor.after(tourNetwork);
  tourAnchor.remove();
  document.body.classList.remove('presenting', 'tour-motion');
  delete document.body.dataset.presentation;
  caption.hidden = true;
  startButton.textContent = 'Present the lab';
  startButton.setAttribute('aria-pressed', 'false');
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch {}
  }
}

startButton?.addEventListener('click', () => (active ? stop() : start()));
exitButton.addEventListener('click', () => stop());
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Resume tour' : 'Pause tour';
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && active) stop();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && active) stop();
});
