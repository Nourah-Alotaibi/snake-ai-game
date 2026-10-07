import test from "node:test";
import assert from "node:assert/strict";
import { exactShapley, explainMove } from "../web/explain.mjs";
import { Learner } from "../web/core.mjs";
test("SHAP matches linear effects including a nonzero reference", () => {
  const r = exactShapley((x) => 7 + 2 * x[0] - 3 * x[1], [4, 2, 1], [1, 1, 0]);
  assert.deepEqual(r.contributions, [6, -3, 0]);
  assert.equal(r.baseline, 6);
  assert.equal(r.output, 9);
});
test("SHAP splits symmetric interactions and ignores dummy sensors", () => {
  const r = exactShapley((x) => 6 * x[0] * x[1], [1, 1, 1]);
  assert.deepEqual(r.contributions, [3, 3, 0]);
  assert.equal(r.residual, 0);
});
test("real-network SHAP is complete, deterministic and does not train", () => {
  const l = new Learner();
  for (let i = 0; i < 100; i++) l.step();
  const before = JSON.stringify({
    brain: l.export(),
    rng: l.rng,
    game: l.game,
    memory: l.memory,
  });
  const r = explainMove(l.net, l.game.state());
  assert.equal(r.evaluations, 2048);
  assert(Math.abs(r.residual) < 1e-9);
  assert(r.output >= 0);
  assert(Math.abs(r.output - (r.q[r.chosen] - r.q[r.alternative])) < 1e-12);
  assert.deepEqual(explainMove(l.net, l.game.state()), r);
  assert.equal(
    JSON.stringify({
      brain: l.export(),
      rng: l.rng,
      game: l.game,
      memory: l.memory,
    }),
    before,
  );
});
