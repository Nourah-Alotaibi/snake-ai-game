import { Learner, evaluate } from "./core.mjs";
import { explainMove } from "./explain.mjs";
let learner = new Learner(),
  watcher = null,
  mode = "train",
  running = false,
  speed = 120,
  last = performance.now(),
  carry = 0,
  lastPost = 0;
const active = () =>
  mode === "watch" ? (watcher ??= Learner.from(learner.export())) : learner;
function emit() {
  postMessage({ type: "state", ...active().snapshot(), running, mode });
}
onmessage = ({ data }) => {
  try {
    switch (data.type) {
      case "configure":
        learner = new Learner(data.settings);
        watcher = null;
        mode = "train";
        running = false;
        break;
      case "run":
        running = !!data.value;
        carry = 0;
        last = performance.now();
        break;
      case "mode":
        running = false;
        mode = data.value === "watch" ? "watch" : "train";
        watcher = null;
        break;
      case "speed":
        speed = Math.max(1, Math.min(2000, Number(data.value) || 10));
        break;
      case "step":
        running = false;
        active().step(mode === "train");
        break;
      case "load":
        learner = Learner.from(data.brain);
        watcher = null;
        mode = "watch";
        running = false;
        postMessage({ type: "loaded", settings: learner.settings });
        break;
      case "export":
        postMessage({
          type: "export",
          brain: learner.export(),
          history: learner.history,
        });
        break;
      case "explain": {
        running = false;
        const current = active();
        if (current.game.done)
          throw Error(
            "This game has ended. Take a single move to start the next board, then explain it.",
          );
        postMessage({
          type: "explanation",
          ...explainMove(current.net, current.game.state()),
        });
        break;
      }
      case "evaluate": {
        running = false;
        const policy = evaluate(learner.net, learner.settings),
          random = evaluate(learner.net, learner.settings, policy.seeds, true);
        postMessage({
          type: "evaluation",
          policy,
          random,
          trainingSteps: learner.steps,
        });
        break;
      }
    }
    emit();
  } catch (e) {
    running = false;
    postMessage({ type: "error", message: e.message });
  }
};
setInterval(() => {
  const now = performance.now(),
    elapsed = Math.min(100, now - last);
  last = now;
  if (running) {
    carry = Math.min(80, carry + (elapsed * speed) / 1000);
    const deadline = now + 8;
    try {
      while (carry >= 1 && performance.now() < deadline) {
        active().step(mode === "train");
        carry--;
      }
    } catch (e) {
      running = false;
      postMessage({ type: "error", message: e.message });
    }
  }
  if (now - lastPost >= 100) {
    lastPost = now;
    emit();
  }
}, 16);
emit();
