import { Learner, evaluate } from "../web/core.mjs";
import fs from "node:fs";
const episodes = Number(process.argv[2] || 400),
  seed = Number(process.argv[3] || 42);
const learner = new Learner({ seed, counterfactual: 0 });
const start = Date.now();
const testSeeds = Array.from({ length: 50 }, (_, i) => 20001 + i),
  initial = evaluate(learner.net, learner.settings, testSeeds),
  random = evaluate(learner.net, learner.settings, testSeeds, true);
let reported = 0;
while (learner.episodes < episodes) {
  learner.step();
  if (learner.episodes >= reported + 100) {
    reported = learner.episodes;
    console.log(
      JSON.stringify({
        episodes: reported,
        steps: learner.steps,
        meanTraining20: learner.snapshot().average,
        seconds: (Date.now() - start) / 1000,
      }),
    );
  }
}
const trained = evaluate(learner.net, learner.settings, testSeeds);
const report = {
  date: new Date().toISOString(),
  method:
    "Frozen greedy policy versus initial network and uniform random actions on the same 50 held-out seed IDs. Food paths diverge when policies differ. One training seed; illustrative, not general performance.",
  settings: learner.settings,
  training: {
    episodes,
    steps: learner.steps,
    updates: learner.updates,
    seconds: (Date.now() - start) / 1000,
  },
  initial,
  random,
  trained,
};
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(
  `results/evaluation-${seed}.json`,
  JSON.stringify(report, null, 2),
);
fs.writeFileSync(
  `results/training-${seed}.json`,
  JSON.stringify(learner.history, null, 2),
);
fs.writeFileSync(`web/trained-${seed}.json`, JSON.stringify(learner.export()));
console.log(JSON.stringify(report));
