import { Learner, evaluate } from "../web/core.mjs";
import fs from "node:fs";
const results = [];
const developmentSeeds = Array.from({ length: 20 }, (_, i) => 10001 + i),
  finalSeeds = Array.from({ length: 50 }, (_, i) => 30001 + i);
for (const seed of [42, 7, 123])
  for (const counterfactual of [0, 1]) {
    const l = new Learner({ seed, counterfactual }),
      start = performance.now(),
      checkpoints = [];
    const initial = evaluate(l.net, l.settings, finalSeeds);
    for (const budget of [2000, 6000, 12000]) {
      while (l.steps < budget) l.step();
      checkpoints.push({
        steps: l.steps,
        updates: l.updates,
        simulated: l.simulated,
        trainingSeconds: (performance.now() - start) / 1000,
        evaluation: evaluate(l.net, l.settings, developmentSeeds),
      });
    }
    const result = {
      seed,
      counterfactual,
      settings: l.settings,
      checkpoints,
      initial,
      final: evaluate(l.net, l.settings, finalSeeds),
      random: evaluate(l.net, l.settings, finalSeeds, true),
      episodes: l.episodes,
      simulated: l.simulated,
      updates: l.updates,
    };
    results.push(result);
    console.log(
      JSON.stringify({
        seed,
        counterfactual,
        means: checkpoints.map((c) => c.evaluation.mean),
        final: result.final.mean,
      }),
    );
    if (seed === 42 && counterfactual === 1) {
      fs.writeFileSync("web/trained.json", JSON.stringify(l.export()));
      fs.writeFileSync(
        "results/example-training.json",
        JSON.stringify(l.history),
      );
    }
  }
fs.writeFileSync(
  "results/ablation.json",
  JSON.stringify(
    {
      method:
        "Three paired training seeds; fixed real-step budgets, network, reward, replay capacity and gradient-update cadence. What-if mode adds two exact simulator queries per real step, so compute and environment access are NOT equal. Intermediate metrics use seed IDs 10001–10020; final metrics use 30001–30050. Reusing report-card seeds is not fresh validation.",
      createdAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  ),
);
