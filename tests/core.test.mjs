import test from "node:test";
import assert from "node:assert/strict";
import {
  Snake,
  Network,
  Learner,
  RNG,
  config,
  evaluate,
} from "../web/core.mjs";
test("seeded worlds and training are reproducible", () => {
  const a = new Learner(),
    b = new Learner();
  for (let i = 0; i < 160; i++) {
    a.step();
    b.step();
  }
  assert.deepEqual(a.export(), b.export());
  assert(a.updates > 0);
});
test("food rewards, growth and no food on body", () => {
  const g = new Snake();
  g.food = [7, 6];
  const length = g.body.length;
  const e = g.step(0);
  assert.equal(e.reward, 10);
  assert.equal(g.score, 1);
  assert.equal(g.body.length, length + 1);
  assert(!g.body.some((p) => JSON.stringify(p) === JSON.stringify(g.food)));
});
test("wall, self, vacating tail and board completion", () => {
  const g = new Snake();
  g.body = [
    [11, 5],
    [10, 5],
    [9, 5],
  ];
  assert.equal(g.state()[0], 1);
  assert.equal(g.step(0).reason, "wall");
  assert.throws(() => g.step(0));
  g.reset();
  g.body = [
    [2, 2],
    [3, 2],
    [3, 3],
    [2, 3],
  ];
  g.direction = 0;
  g.food = [8, 8];
  assert.equal(g.step(0).reason, "self");
  g.reset();
  g.body = [
    [2, 2],
    [3, 2],
    [3, 3],
    [2, 3],
  ];
  g.direction = 1;
  g.food = [8, 8];
  assert.equal(g.step(0).done, false);
  const full = new Snake();
  full.body = Array.from({ length: 144 }, (_, i) => [
    i % 12,
    Math.floor(i / 12),
  ]);
  assert.equal(full.placeFood(), null);
});
test("hunger ends looping episodes", () => {
  const g = new Snake();
  g.hungrySteps = 99;
  g.food = [0, 0];
  assert.equal(g.step(0).reason, "timeout");
});
test("backprop matches a finite-difference derivative", () => {
  const n = new Network([11, 8, 3], new RNG(3)),
    example = [{ state: Array(11).fill(0.6), action: 1, target: 0.2 }];
  const { grads } = n.gradients(example);
  for (const [layer, key, index] of [
    [0, "w", 3],
    [0, "b", 2],
    [1, "w", 5],
    [1, "b", 1],
  ]) {
    const array = n.layers[layer][key],
      original = array[index],
      h = 1e-5;
    array[index] = original + h;
    const plus = n.gradients(example).loss;
    array[index] = original - h;
    const minus = n.gradients(example).loss;
    array[index] = original;
    assert(
      Math.abs((plus - minus) / (2 * h) - grads[layer][key][index]) < 1e-6,
    );
  }
});
test("Adam updates parameters and reduces a supervised target loss", () => {
  const n = new Network([11, 8, 3]),
    examples = [{ state: Array(11).fill(0.4), action: 0, target: 2 }];
  const first = n.gradients(examples).loss;
  for (let i = 0; i < 100; i++) n.train(examples, 0.003);
  assert(n.gradients(examples).loss < first * 0.1);
});
test("target net stays frozen until the configured copy interval", () => {
  const l = new Learner({ targetEvery: 10 });
  const original = JSON.stringify(l.target.weights());
  while (l.updates < 9) l.step();
  assert.equal(JSON.stringify(l.target.weights()), original);
  assert.notEqual(JSON.stringify(l.net.weights()), original);
  while (l.updates < 10) l.step();
  assert.deepEqual(l.net.weights(), l.target.weights());
});
test("evaluation cannot train or change training RNG", () => {
  const l = new Learner();
  for (let i = 0; i < 100; i++) l.step();
  const before = JSON.stringify(l.export()),
    rng = l.rng.state;
  evaluate(l.net, l.settings, [9001, 9002]);
  assert.equal(JSON.stringify(l.export()), before);
  assert.equal(l.rng.state, rng);
  for (let i = 0; i < 50; i++) l.step(false);
  assert.equal(JSON.stringify(l.export()), before);
});
test("checkpoint round-trip and malformed input rejection", () => {
  const l = new Learner();
  for (let i = 0; i < 100; i++) l.step();
  const data = l.export(),
    copy = Learner.from(data);
  assert.deepEqual(copy.net.weights(), l.net.weights());
  data.weights[0].w[0] = NaN;
  assert.throws(() => Learner.from(data));
  assert.throws(() => config({ learningRate: 0 }));
  assert.throws(() => config({ hidden: 1000 }));
  assert.throws(() => config({ epsilonStart: 0, epsilonMin: 0.1 }));
});
test("memory is bounded and epsilon retains progress across games", () => {
  const l = new Learner({ memorySize: 128 });
  for (let i = 0; i < 500; i++) l.step();
  assert.equal(l.memory.length, 128);
  assert(l.episodes > 0);
  assert(l.epsilon() < 1);
});
test("counterfactual fork leaves the real world and RNG untouched", () => {
  const g = new Snake();
  g.food = [7, 6];
  const before = JSON.stringify(g);
  const imagined = g.fork().step(0);
  assert.equal(JSON.stringify(g), before);
  assert.deepEqual(g.step(0), imagined);
});
test("what-if replay adds two alternatives without extra optimizer updates", () => {
  const a = new Learner({ counterfactual: 0 }),
    b = new Learner({ counterfactual: 1 });
  for (let i = 0; i < 200; i++) {
    a.step();
    b.step();
  }
  assert.equal(a.updates, b.updates);
  assert.equal(b.simulated, 400);
  assert.equal(a.simulated, 0);
  assert(b.memory.some((e) => e.simulated));
});
test("architecture, reward and exploration controls have real effects", () => {
  const learner = new Learner({
    hidden: 8,
    depth: 3,
    epsilonStart: 0.6,
    epsilonDecay: 0.9,
    epsilonMin: 0.1,
  });
  assert.deepEqual(learner.net.sizes, [11, 8, 8, 8, 3]);
  assert.equal(learner.epsilon(), 0.6);
  learner.episodes = 1000;
  assert.equal(learner.epsilon(), 0.1);
  const game = new Snake(42, {
    foodReward: 15,
    deathPenalty: 4,
    guidance: 0.5,
  });
  game.food = [8, 6];
  assert.equal(game.step(0).reward, 0.49);
  assert.equal(game.step(0).reward, 15);
  game.body = [
    [11, 6],
    [10, 6],
    [9, 6],
  ];
  assert.equal(game.step(0).reward, -4);
});
test("learning rate changes actual weight updates", () => {
  const a = new Network([11, 8, 3]),
    b = new Network([11, 8, 3]);
  const examples = [{ state: Array(11).fill(0.5), action: 2, target: 3 }];
  a.train(examples, 0.001);
  b.train(examples, 0.01);
  assert.notDeepEqual(a.weights(), b.weights());
});
