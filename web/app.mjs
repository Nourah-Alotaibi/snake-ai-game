import { DEFAULTS } from "./core.mjs";
const $ = (id) => document.getElementById(id),
  worker = new Worker(new URL("./worker.mjs", import.meta.url), {
    type: "module",
  });
let latest = null,
  lastEvaluation = null,
  lastExplanation = null;
const fields = [
  [
    "learningRate",
    "Learning rate",
    "How big is each correction? Too large can erase useful learning.",
    [0.0001, 0.0005, 0.001, 0.003, 0.01, 0.02],
  ],
  [
    "epsilonStart",
    "Starting curiosity · ε",
    "Chance of trying a random move, even if another looks better.",
    0,
    1,
    0.05,
  ],
  [
    "gamma",
    "Future thinking · γ",
    "How much future snacks matter. Zero cares only about the next reward.",
    0,
    0.99,
    0.01,
  ],
  [
    "counterfactual",
    "“What if?” replay",
    "Add outcomes from the two moves it did not take. Uses two extra simulator queries.",
    [
      [1, "On · learn from alternatives"],
      [0, "Off · standard replay"],
    ],
  ],
  [
    "epsilonDecay",
    "Curiosity fade",
    "Multiplied after each training game. Closer to one stays curious longer.",
    [0.95, 0.97, 0.985, 0.995, 1],
  ],
  [
    "epsilonMin",
    "Curiosity floor",
    "Keep a little exploration even after many games. Must not exceed starting curiosity.",
    0,
    0.5,
    0.01,
  ],
  [
    "hidden",
    "Neurons per layer",
    "More capacity, more computation. Bigger is not automatically better.",
    [8, 16, 32, 64],
  ],
  [
    "depth",
    "Hidden layers",
    "Extra stages for combining the eleven signals.",
    [1, 2, 3],
  ],
  [
    "batchSize",
    "Memories per lesson",
    "How many replay examples share one gradient update.",
    [8, 16, 32, 64],
  ],
  [
    "memorySize",
    "Replay capacity",
    "Recent experiences kept in its notebook. Old ones are replaced.",
    [128, 500, 2000, 5000, 10000],
  ],
  [
    "targetEvery",
    "Target refresh",
    "Copy the learner to its stable reference every N updates.",
    [10, 50, 200, 500, 1000],
  ],
  [
    "foodReward",
    "Snack reward",
    "How strongly food is rewarded. Changes what it tries to maximize.",
    1,
    20,
    1,
  ],
  [
    "deathPenalty",
    "Collision penalty",
    "Cost of hitting a wall, itself, or running out of time.",
    1,
    20,
    1,
  ],
  [
    "guidance",
    "Distance hint",
    "Extra reward for getting closer to food; a cost for moving away. Zero removes this designed hint.",
    0,
    0.5,
    0.05,
  ],
  [
    "seed",
    "Experiment seed",
    "Same seed and settings reproduce the same training sequence.",
    1,
    2147483647,
    1,
  ],
];
for (let i = 0; i < fields.length; i++) {
  const [key, label, help, options, max, step] = fields[i],
    wrap = document.createElement("div");
  wrap.className = "control";
  const title = document.createElement("label");
  title.htmlFor = key;
  title.textContent = label;
  const output = document.createElement("output");
  output.id = key + "-value";
  title.append(output);
  wrap.append(title);
  const input = document.createElement(
    Array.isArray(options) ? "select" : "input",
  );
  input.id = key;
  input.name = key;
  if (Array.isArray(options)) {
    for (const option of options) {
      const [value, text] = Array.isArray(option)
          ? option
          : [option, String(option)],
        el = document.createElement("option");
      el.value = value;
      el.textContent = text;
      input.append(el);
    }
  } else {
    input.type = key === "seed" ? "number" : "range";
    input.min = options;
    input.max = max;
    input.step = step;
  }
  input.value = DEFAULTS[key];
  input.addEventListener("input", () => {
    output.textContent = Array.isArray(options) ? "" : input.value;
  });
  output.textContent = Array.isArray(options) ? "" : input.value;
  wrap.append(input);
  const hint = document.createElement("p");
  hint.textContent = help;
  hint.id = key + "-help";
  hint.className = "parameter-help";
  hint.setAttribute("role", "tooltip");
  const helpButton = document.createElement("button");
  helpButton.type = "button";
  helpButton.className = "help-button";
  helpButton.textContent = "?";
  helpButton.setAttribute("aria-label", "Explain " + label);
  helpButton.setAttribute("aria-describedby", hint.id);
  helpButton.setAttribute("aria-expanded", "false");
  helpButton.onclick = () => {
    const open = wrap.classList.toggle("help-open");
    helpButton.setAttribute("aria-expanded", String(open));
  };
  title.append(helpButton);
  input.setAttribute("aria-describedby", hint.id);
  wrap.append(hint);
  $(i < 4 ? "main-controls" : "advanced-controls").append(wrap);
}
function setControls(settings) {
  for (const [key, , , options] of fields) {
    const control = $(key);
    if (control.tagName === "SELECT" && !Array.from(control.options).some(option => option.value === String(settings[key]))) {
      control.add(new Option(String(settings[key]), String(settings[key])));
    }
    control.value = settings[key];
    $(key + "-value").textContent = Array.isArray(options) ? "" : settings[key];
  }
}
function message(text) {
  $("status").textContent = text;
}
function send(type, data = {}) {
  if (["configure", "run", "step", "mode", "load"].includes(type)) {
    lastExplanation = null;
    $("explanation").replaceChildren();
  }
  worker.postMessage({ type, ...data });
}
$("explain").onclick = () => {
  send("explain");
  message("Pausing to calculate exact SHAP values for this board…");
};
$("settings").addEventListener("submit", (e) => {
  e.preventDefault();
  const settings = Object.fromEntries(
    fields.map(([key]) => [key, Number($(key).value)]),
  );
  if (settings.epsilonMin > settings.epsilonStart) {
    message("Set the curiosity floor at or below starting curiosity.");
    return;
  }
  send("configure", { settings });
  lastEvaluation = null;
  $("evaluation").textContent = "";
  message("Fresh brain ready. Press Start learning to begin your experiment.");
});
for (const button of document.querySelectorAll("[data-preset]"))
  button.onclick = () => {
    const settings = { ...DEFAULTS };
    if (button.dataset.preset === "noplanning") settings.counterfactual = 0;
    if (button.dataset.preset === "myopic") settings.gamma = 0;
    if (button.dataset.preset === "tiny") settings.hidden = 8;
    setControls(settings);
    message(
      "Preset staged. Apply settings to start a fresh experiment; your current brain has not changed.",
    );
  };
$("run").onclick = () => send("run", { value: !latest?.running });
$("step").onclick = () => send("step");
$("watch").onclick = () => {
  send("mode", { value: latest?.mode === "watch" ? "train" : "watch" });
  message(
    "Mode changed and paused. Watching uses a separate game and does not change the training world or weights.",
  );
};
$("speed").onchange = () => send("speed", { value: Number($("speed").value) });
let currentTheme = "dark";
function applyTheme(theme) {
  currentTheme = theme;
  document.body.classList.toggle("light", theme === "light");
  document.body.classList.toggle("midnight", theme === "midnight");
  $("theme").textContent = theme === "light" ? "Dark mode" : "Light mode";
  $("midnight").setAttribute("aria-pressed", String(theme === "midnight"));
  try { localStorage.setItem("snake-lab-theme", theme); } catch {}
  if (latest) render(latest);
}
$("theme").onclick = () => applyTheme(currentTheme === "light" ? "dark" : "light");
$("midnight").onclick = () => applyTheme(currentTheme === "midnight" ? "dark" : "midnight");
try { const saved = localStorage.getItem("snake-lab-theme"); if (["dark", "light", "midnight"].includes(saved)) applyTheme(saved); } catch {}
$("example").onclick = async () => {
  try {
    $("example").disabled = true;
    const response = await fetch("./trained.json");
    if (!response.ok) throw Error("Trained example unavailable");
    send("load", { brain: await response.json() });
    message(
      "Loaded the saved what-if learner. Press Start watching, or switch to training. See the report for its measured results.",
    );
  } catch (e) {
    message(e.message);
  } finally {
    $("example").disabled = false;
  }
};
$("evaluate").onclick = () => {
  send("evaluate");
  message("Checking a frozen brain against a random player…");
};
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("save").onclick = () => send("export");
$("load").onchange = async () => {
  try {
    const file = $("load").files[0];
    if (!file) return;
    if (file.size > 2_000_000)
      throw Error("Choose a brain file smaller than 2 MB");
    let brain;
    try { brain = JSON.parse(await file.text()); }
    catch { throw Error("This file is not valid JSON. Choose a saved Snake Lab brain file."); }
    send("load", { brain });
  } catch (e) {
    message(e.message);
  } finally {
    $("load").value = "";
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    send("run", { value: false });
    message("Paused while this tab is hidden. Resume when you return.");
  }
});
worker.onerror = (e) =>
  message(
    "The learning worker could not start. Serve this folder over HTTP and use a current browser. " +
      e.message,
  );
$("network-expand").onclick = () => {
  $("network-dialog").showModal();
  if (latest) drawNetwork(latest);
};
$("network-close").onclick = () => $("network-dialog").close();
$("tutorial-open").onclick = () => $("tutorial-dialog").showModal();
$("tutorial-close").onclick = () => $("tutorial-dialog").close();
worker.onmessage = ({ data }) => {
  if (data.type === "explanation-ended") {
    $("explanation").textContent = "Game ended. The next game will show a new explanation.";
    return;
  }
  if (data.type === "explanation") {
    lastExplanation = data;
    const panel = $("explanation");
    panel.replaceChildren();
    const heading = document.createElement("p");
    heading.className = "result shap-title";
    heading.textContent = `${actionNames[data.chosen]} over ${actionNames[data.alternative].toLowerCase()}`;
    panel.append(heading);
    const ranked = data.contributions
      .map((value, i) => ({ value, i }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const top = ranked[0],
      takeaway = document.createElement("p");
    takeaway.textContent =
      Math.abs(top.value) < 1e-10
        ? "These sensors do not change the preference from the reference."
        : `${sensorNames[top.i]} (${data.state[top.i] ? "on" : "off"}) has the largest influence: it ${top.value > 0 ? "supports" : "pushes against"} the preferred move.`;
    panel.append(takeaway);
    const scale = Math.max(1e-10, ...ranked.map((r) => Math.abs(r.value)));
    for (const { value, i } of ranked) {
      const row = document.createElement("div");
      row.className = "shap-row";
      const label = document.createElement("span"),
        track = document.createElement("span"),
        bar = document.createElement("span"),
        number = document.createElement("span");
      label.textContent = `${sensorNames[i]} · ${data.state[i] ? "on" : "off"}`;
      track.className = "shap-track";
      bar.className = "shap-bar" + (value < 0 ? " negative" : "");
      bar.style.width = `${(Math.abs(value) / scale) * 100}%`;
      number.textContent = `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
      track.append(bar);
      row.append(label, track, number);
      panel.append(row);
    }
    const total = document.createElement("p");
    total.className = "small";
    total.textContent = `Reference gap ${data.baseline.toFixed(3)} + sensor contributions ${(data.output - data.baseline).toFixed(3)} = current Q-gap ${data.output.toFixed(3)}. ${data.evaluations.toLocaleString()} combinations checked.`;
    total.className = "small shap-calculation";
    panel.append(total);
    if (!data.automatic) message(
      "SHAP explanation ready. Training is paused; this check changed no weights or replay memory.",
    );
    return;
  }
  if (data.type === "error") {
    message(data.message);
    return;
  }
  if (data.type === "loaded") {
    lastEvaluation = null;
    setControls(data.settings);
    $("evaluation").textContent = "";
    message("Brain loaded. Press Start watching, or return to training.");
    return;
  }
  if (data.type === "evaluation") {
    lastEvaluation = data;
    $("evaluation").replaceChildren();
    const result = document.createElement("p");
    result.className = "result";
    result.textContent = `${data.policy.mean.toFixed(2)} vs ${data.random.mean.toFixed(2)}`;
    const detail = document.createElement("p");
    detail.className = "small";
    detail.textContent = `Mean apples/game: your frozen brain vs random moves, after ${data.trainingSteps.toLocaleString()} training steps. ${data.policy.games} games each. Full scores go into your saved report.`;
    $("evaluation").append(result, detail);
    message(
      "Report card complete. This comparison did not change the model or replay memory.",
    );
    return;
  }
  if (data.type === "export") {
    download("snake-lab-brain.json", JSON.stringify({ ...data.brain,
      experiment: { history: data.history, evaluation: lastEvaluation, explanation: lastExplanation }
    }, null, 2), "application/json");
    message("Brain and experiment diary saved together in one file.");
    return;
  }
  if (data.type === "state") {
    latest = data;
    render(data);
  }
};
const actionNames = ["Straight", "Turn right", "Turn left"],
  sensorNames = [
    "Danger ahead",
    "Danger right",
    "Danger left",
    "Facing left",
    "Facing right",
    "Facing up",
    "Facing down",
    "Food left",
    "Food right",
    "Food up",
    "Food down",
  ];
function render(s) {
  $("score").textContent = s.game.score;
  $("episodes").textContent = s.episodes.toLocaleString();
  $("average").textContent = s.history.length ? s.average.toFixed(1) : "—";
  $("updates").textContent = s.updates.toLocaleString();
  $("memory").textContent = s.memory.toLocaleString();
  $("loss").textContent = s.loss === null ? "—" : s.loss.toFixed(3);
  $("simulated").textContent = s.simulated.toLocaleString();
  $("mode-badge").textContent =
    s.mode === "watch"
      ? "Frozen brain · watching"
      : s.running
        ? "Learning · weights updating"
        : "Training paused";
  $("run").textContent = s.running
    ? "Pause"
    : s.mode === "watch"
      ? "Start watching"
      : "Start learning";
  $("watch").textContent =
    s.mode === "watch" ? "Return to training" : "Watch this brain";
  $("decision").textContent = s.decision
    ? `${actionNames[s.decision.action]} · ${s.decision.random ? "curiosity picked this move" : "the network picked this move"} · ${s.event} · reward ${s.reward.toFixed(2)}`
    : "Ready for its first lesson. Start fresh or try the trained example.";
  drawBoard(s.game);
  drawChart(s.history);
  const q = s.decision?.q ?? [0, 0, 0],
    min = Math.min(0, ...q),
    range = Math.max(...q) - min || 1;
  $("q-values").replaceChildren();
  q.forEach((value, i) => {
    const row = document.createElement("div");
    row.className = "q-row" + (s.decision?.action === i ? " chosen" : "");
    const label = document.createElement("span");
    label.textContent = actionNames[i];
    const track = document.createElement("div");
    track.className = "q-track";
    const fill = document.createElement("div");
    fill.className = "q-fill";
    fill.style.width = ((value - min) / range) * 100 + "%";
    track.append(fill);
    const number = document.createElement("span");
    number.textContent = value.toFixed(2);
    row.append(label, track, number);
    $("q-values").append(row);
  });
  $("architecture").textContent = `11 sensor inputs → ${s.settings.depth} hidden ${s.settings.depth === 1 ? "layer" : "layers"} (${s.settings.hidden} neurons each) → 3 move scores. Hidden layers show up to 8 neurons; brighter dots mean stronger activation. Arrows show information flow, not learned connection strength.`;
  if ($("network")) {
    drawNetwork(s);
    $("sensors").replaceChildren();
    sensorNames.forEach((name, i) => {
      const el = document.createElement("span");
      el.textContent = name;
      el.className = s.decision?.state[i] ? "on" : "";
      $("sensors").append(el);
    });
  }
}
function drawNetwork(s) {
  const ns = "http://www.w3.org/2000/svg";
  const create = (tag, attrs, text) => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const layers = s.networkActivations ?? s.decision?.activations ?? [];
  const count = s.settings.depth + 2, width = 460, height = 200;
  const svg = create("svg", {viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `Neural network: 11 inputs, ${s.settings.depth} hidden layers of ${s.settings.hidden} neurons, and three move score outputs`});
  svg.append(create("title", {}, "Sensors → hidden layers → move scores"));
  const defs = create("defs", {}), marker = create("marker", {id: "network-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse"});
  marker.append(create("path", {d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--accent)"}));
  defs.append(marker); svg.append(defs);
  const spacing = 280 / (count - 1);
  const links = create("g", {class: "network-links", "aria-hidden": "true"});
  svg.append(links);
  for (let l = 0; l < count - 1; l++) {
    const x = 50 + l * spacing;
    const fromCount = l === 0 ? 11 : Math.min(8, s.settings.hidden);
    const toCount = l === count - 2 ? 3 : Math.min(8, s.settings.hidden);
    for (let i = 0; i < fromCount; i++) {
      for (let j = 0; j < toCount; j++) {
        links.append(create("line", {x1: x + 6, y1: 55 + i * 110 / (fromCount - 1), x2: x + spacing - 6, y2: 55 + j * 110 / (toCount - 1)}));
      }
    }
  }
  for (let l = 0; l < count; l++) {
    const x = 50 + l * spacing, values = layers[l] ?? [], output = l === count - 1;
    const title = l === 0 ? "Inputs" : output ? "Outputs" : `Hidden ${l}`;
    svg.append(create("text", {x, y: 19, "text-anchor": "middle", class: "network-label"}, title));
    svg.append(create("text", {x, y: 37, "text-anchor": "middle", class: "network-count"}, l === 0 ? "11 sensors" : output ? "3 scores" : `${s.settings.hidden} neurons`));
    if (l < count - 1) {
      svg.append(create("line", {x1: x + 13, y1: 180, x2: x + spacing - 13, y2: 180, class: "network-flow", "marker-end": "url(#network-arrow)"}));
    }
    const nodes = l === 0 ? 11 : output ? 3 : Math.min(8, s.settings.hidden);
    const max = Math.max(1e-9, ...values.map(Math.abs));
    for (let n = 0; n < nodes; n++) {
      const y = nodes === 1 ? 143 : 55 + n * 110 / (nodes - 1);
      const circle = create("circle", {cx: x, cy: y, r: 5, class: "network-node", opacity: values.length ? 0.25 + 0.75 * Math.min(1, Math.abs(values[n]) / max) : 0.25});
      const label = l === 0 ? sensorNames[n] : output ? actionNames[n] : `Hidden layer ${l}, neuron ${n + 1}`;
      circle.append(create("title", {}, `${label}: ${(values[n] ?? 0).toFixed(3)}`)); svg.append(circle);
      if (output) {
        svg.append(create("text", {x: x + 14, y: y - 2, class: "network-action"}, actionNames[n]));
        svg.append(create("text", {x: x + 14, y: y + 13, class: "network-score"}, (values[n] ?? 0).toFixed(2)));
      }
    }
    if (l > 0 && !output && s.settings.hidden > nodes) svg.append(create("text", {x, y: 197, "text-anchor": "middle", class: "network-count"}, `+${s.settings.hidden - nodes} more`));
  }
  $("network").replaceChildren(svg);
  if ($("network-dialog").open) {
    const large = svg.cloneNode(true);
    large.querySelector("marker").id = "network-arrow-large";
    large.querySelectorAll("[marker-end]").forEach(el => el.setAttribute("marker-end", "url(#network-arrow-large)"));
    $("network-large").replaceChildren(large);
  }

}
function drawBoard(g) {
  const c = $("board"),
    x = c.getContext("2d"),
    cell = c.width / g.size;
  x.fillStyle = document.body.classList.contains("midnight") ? "#14201a" : (document.body.classList.contains("light") ? "#0A2112" : "#0c241b");
  x.fillRect(0, 0, 600, 600);
  x.strokeStyle = document.body.classList.contains("midnight") ? "#293a2c" : (document.body.classList.contains("light") ? "#203C28" : "#244a37");
  x.lineWidth = 1;
  for (let i = 0; i <= g.size; i++) {
    x.beginPath();
    x.moveTo(i * cell, 0);
    x.lineTo(i * cell, 600);
    x.moveTo(0, i * cell);
    x.lineTo(600, i * cell);
    x.stroke();
  }
  g.body.forEach(([a, b], i) => {
    x.fillStyle = document.body.classList.contains("midnight") ? (i ? "#94b978" : "#AFD58B") : (document.body.classList.contains("light") ? "#83D34E" : (i ? "#86c79b" : "#b7e8bc"));
    x.beginPath();
    x.roundRect(a * cell + cell * 0.2, b * cell + cell * 0.2, cell * 0.6, cell * 0.6, 2);
    x.fill();
  });
  if (g.food) {
    x.fillStyle = (document.body.classList.contains("midnight") || document.body.classList.contains("light")) ? "#F06459" : "#ef615b";
    x.beginPath();
    x.arc(
      (g.food[0] + 0.5) * cell,
      (g.food[1] + 0.5) * cell,
      cell * 0.28,
      0,
      Math.PI * 2,
    );
    x.fill();
    x.strokeStyle = "#9ed7b5";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo((g.food[0] + 0.5) * cell, (g.food[1] + 0.25) * cell);
    x.lineTo((g.food[0] + 0.6) * cell, (g.food[1] + 0.13) * cell);
    x.stroke();
  }
  const [a, b] = g.body[0],
    d = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ][g.direction];
  x.fillStyle = document.body.classList.contains("midnight") ? "#14201a" : (document.body.classList.contains("light") ? "#0A2112" : "#0c241b");
  for (const sign of [-1, 1]) {
    x.beginPath();
    x.arc(
      (a + 0.5) * cell + d[0] * cell * 0.2 + d[1] * sign * cell * 0.18,
      (b + 0.5) * cell + d[1] * cell * 0.2 + d[0] * sign * cell * 0.18,
      3,
      0,
      Math.PI * 2,
    );
    x.fill();
  }
}
function drawChart(history) {
  const c = $("chart"),
    x = c.getContext("2d"),
    w = c.width,
    h = c.height;
  x.clearRect(0, 0, w, h);
  const styles = getComputedStyle(document.body),
    muted = styles.getPropertyValue("--muted"),
    accent = styles.getPropertyValue("--accent");
  x.fillStyle = muted;
  x.font = "12px system-ui";
  const empty = history.length < 2;
  c.style.display = empty ? "none" : "block";
  $("chart-empty").hidden = !empty;
  if (empty) return;
  const max = Math.max(5, ...history.map((v) => v.score));
  x.fillText(String(max) + " apples", 5, 14);
  x.fillText("game " + history[0].episode, 5, h - 2);
  x.fillText("game " + history.at(-1).episode, w - 90, h - 2);
  function line(values, color, width) {
    x.strokeStyle = color;
    x.lineWidth = width;
    x.beginPath();
    values.forEach((v, i) => {
      const a = 8 + (i * (w - 16)) / (values.length - 1),
        b = h - 24 - (v / max) * (h - 46);
      i ? x.lineTo(a, b) : x.moveTo(a, b);
    });
    x.stroke();
  }
  line(
    history.map((v) => v.score),
    document.body.classList.contains("midnight") ? "#729565" : (document.body.classList.contains("light") ? "#63875C" : "#647b9266"),
    1,
  );
  line(
    history.map((_, i) => {
      const a = history.slice(Math.max(0, i - 19), i + 1);
      return a.reduce((v, e) => v + e.score, 0) / a.length;
    }),
    accent,
    3,
  );
}
message(
  "Ready. Press Start learning, or load the optional example.",
);

// Opening the optional section reveals its complete learning workflow.
const optionalSection = document.querySelector('.deep-learning');
optionalSection.addEventListener('toggle', () => {
  if (optionalSection.open) optionalSection.querySelectorAll('details').forEach(detail => { detail.open = true; });
});
