// Independent, dependency-free Double DQN implementation for an educational lab.
export const DEFAULTS = Object.freeze({
  seed: 42,
  learningRate: 0.001,
  gamma: 0.95,
  epsilonStart: 1,
  epsilonDecay: 0.985,
  epsilonMin: 0.05,
  hidden: 32,
  depth: 2,
  batchSize: 32,
  memorySize: 5000,
  targetEvery: 200,
  foodReward: 10,
  deathPenalty: 10,
  guidance: 0.1,
  counterfactual: 1,
});
const LIMITS = {
  seed: [1, 2147483647, true],
  learningRate: [0.00005, 0.02],
  gamma: [0, 0.99],
  epsilonStart: [0, 1],
  epsilonDecay: [0.9, 1],
  epsilonMin: [0, 0.5],
  hidden: [8, 64, true],
  depth: [1, 3, true],
  batchSize: [8, 64, true],
  memorySize: [128, 10000, true],
  targetEvery: [10, 1000, true],
  foodReward: [1, 20],
  deathPenalty: [1, 20],
  guidance: [0, 0.5],
  counterfactual: [0, 1, true],
};
export function config(input = {}) {
  const result = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (input[key] !== undefined) result[key] = input[key];
    const [lo, hi, integer] = LIMITS[key],
      v = result[key];
    if (
      typeof v !== "number" ||
      !Number.isFinite(v) ||
      v < lo ||
      v > hi ||
      (integer && !Number.isInteger(v))
    )
      throw Error(`Invalid ${key}`);
  }
  if (result.epsilonMin > result.epsilonStart)
    throw Error("Minimum curiosity must not exceed starting curiosity");
  return result;
}
export class RNG {
  constructor(seed = 42) {
    this.state = seed >>> 0;
  }
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n) {
    return Math.floor(this.next() * n);
  }
}
export const argmax = (values) => {
  let best = 0;
  for (let i = 1; i < values.length; i++)
    if (values[i] > values[best]) best = i;
  return best;
};
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
export class Snake {
  constructor(seed = 42, settings = DEFAULTS) {
    this.rng = new RNG(seed);
    this.settings = config(settings);
    this.size = 24;
    this.reset();
  }
  reset() {
    this.body = [
      [12, 12],
      [11, 12],
      [10, 12],
    ];
    this.direction = 0;
    this.score = 0;
    this.steps = 0;
    this.hungrySteps = 0;
    this.done = false;
    this.food = this.placeFood();
  }
  placeFood() {
    const free = [];
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++)
        if (!this.body.some((p) => same(p, [x, y]))) free.push([x, y]);
    return free.length ? free[this.rng.int(free.length)] : null;
  }
  fork() {
    const copy = Object.create(Snake.prototype);
    Object.assign(copy, this);
    copy.body = this.body.map((p) => [...p]);
    copy.food = this.food && [...this.food];
    copy.rng = new RNG();
    copy.rng.state = this.rng.state;
    return copy;
  }
  nextCell(action) {
    const d = (this.direction + (action === 1 ? 1 : action === 2 ? 3 : 0)) % 4;
    return {
      direction: d,
      cell: [
        this.body[0][0] + DIRECTIONS[d][0],
        this.body[0][1] + DIRECTIONS[d][1],
      ],
    };
  }
  collision(cell, growing = false) {
    if (cell.some((v) => v < 0 || v >= this.size)) return "wall";
    if (this.body.slice(0, growing ? undefined : -1).some((p) => same(p, cell)))
      return "self";
    return null;
  }
  state() {
    const [x, y] = this.body[0],
      food = this.food ?? [x, y];
    return [0, 1, 2]
      .map((a) => {
        const { cell } = this.nextCell(a);
        return +!!this.collision(cell, same(cell, food));
      })
      .concat([
        +(this.direction === 2),
        +(this.direction === 0),
        +(this.direction === 3),
        +(this.direction === 1),
        +(food[0] < x),
        +(food[0] > x),
        +(food[1] < y),
        +(food[1] > y),
      ]);
  }
  step(action) {
    if (this.done) throw Error("Reset the completed game before stepping");
    if (!Number.isInteger(action) || action < 0 || action > 2)
      throw Error("Invalid action");
    const state = this.state(),
      old = this.body[0],
      { cell, direction } = this.nextCell(action),
      ate = same(cell, this.food),
      hit = this.collision(cell, ate);
    this.direction = direction;
    this.steps++;
    this.hungrySteps++;
    let reward = -0.01,
      reason = "move";
    if (hit) {
      this.done = true;
      reward = -this.settings.deathPenalty;
      reason = hit;
    } else {
      this.body.unshift(cell);
      if (ate) {
        this.score++;
        this.hungrySteps = 0;
        reward = this.settings.foodReward;
        this.food = this.placeFood();
        reason = "food";
        if (!this.food) {
          this.done = true;
          reason = "board filled";
        }
      } else {
        this.body.pop();
        const oldDistance =
          Math.abs(old[0] - this.food[0]) + Math.abs(old[1] - this.food[1]);
        const distance =
          Math.abs(cell[0] - this.food[0]) + Math.abs(cell[1] - this.food[1]);
        reward += this.settings.guidance * Math.sign(oldDistance - distance);
      }
      if (!this.done && (this.hungrySteps >= 100 || this.steps >= 1500)) {
        this.done = true;
        reward = -this.settings.deathPenalty;
        reason = "timeout";
      }
    }
    return {
      state,
      action,
      reward,
      next: this.state(),
      done: this.done,
      reason,
    };
  }
  snapshot() {
    return {
      body: this.body.map((p) => [...p]),
      food: this.food && [...this.food],
      direction: this.direction,
      score: this.score,
      size: this.size,
      steps: this.steps,
    };
  }
}

export class Network {
  constructor(sizes, rng = new RNG()) {
    this.sizes = [...sizes];
    this.t = 0;
    this.layers = [];
    for (let l = 1; l < sizes.length; l++) {
      const input = sizes[l - 1],
        output = sizes[l],
        length = input * output,
        scale = Math.sqrt(6 / (input + output));
      const w = Float64Array.from(
        { length },
        () => (rng.next() * 2 - 1) * scale,
      );
      this.layers.push({
        input,
        output,
        w,
        b: new Float64Array(output),
        mw: new Float64Array(length),
        vw: new Float64Array(length),
        mb: new Float64Array(output),
        vb: new Float64Array(output),
      });
    }
  }
  forward(input) {
    const activations = [input];
    for (let n = 0; n < this.layers.length; n++) {
      const layer = this.layers[n],
        previous = activations[n],
        out = new Float64Array(layer.output);
      for (let j = 0; j < layer.output; j++) {
        let sum = layer.b[j];
        for (let i = 0; i < layer.input; i++)
          sum += layer.w[j * layer.input + i] * previous[i];
        out[j] = n === this.layers.length - 1 ? sum : Math.max(0, sum);
      }
      activations.push(out);
    }
    return activations;
  }
  predict(input) {
    return this.forward(input).at(-1);
  }
  gradients(examples) {
    const grads = this.layers.map((l) => ({
      w: new Float64Array(l.w.length),
      b: new Float64Array(l.b.length),
    }));
    let loss = 0;
    for (const { state, action, target } of examples) {
      const a = this.forward(state),
        error = a.at(-1)[action] - target;
      loss +=
        Math.abs(error) <= 1 ? 0.5 * error * error : Math.abs(error) - 0.5;
      let delta = new Float64Array(3);
      delta[action] = Math.max(-1, Math.min(1, error)) / examples.length;
      for (let n = this.layers.length - 1; n >= 0; n--) {
        const l = this.layers[n],
          g = grads[n],
          previous = new Float64Array(l.input);
        for (let j = 0; j < l.output; j++) {
          g.b[j] += delta[j];
          for (let i = 0; i < l.input; i++) {
            const ix = j * l.input + i;
            g.w[ix] += delta[j] * a[n][i];
            previous[i] += l.w[ix] * delta[j];
          }
        }
        if (n > 0)
          for (let i = 0; i < previous.length; i++)
            if (a[n][i] <= 0) previous[i] = 0;
        delta = previous;
      }
    }
    return { loss: loss / examples.length, grads };
  }
  train(examples, rate) {
    const { loss, grads } = this.gradients(examples);
    if (!Number.isFinite(loss))
      throw Error(
        "Training became unstable. Reset with a smaller learning rate.",
      );
    this.t++;
    let norm = 0;
    for (const g of grads)
      for (const array of [g.w, g.b]) for (const x of array) norm += x * x;
    const clip = Math.min(1, 10 / (Math.sqrt(norm) || 1)),
      b1 = 1 - 0.9 ** this.t,
      b2 = 1 - 0.999 ** this.t;
    for (let n = 0; n < this.layers.length; n++)
      for (const key of ["w", "b"]) {
        const l = this.layers[n],
          g = grads[n][key],
          m = l["m" + key],
          v = l["v" + key];
        for (let i = 0; i < g.length; i++) {
          const d = g[i] * clip;
          m[i] = 0.9 * m[i] + 0.1 * d;
          v[i] = 0.999 * v[i] + 0.001 * d * d;
          l[key][i] -= (rate * (m[i] / b1)) / (Math.sqrt(v[i] / b2) + 1e-8);
        }
      }
    return loss;
  }
  copyFrom(other) {
    for (let n = 0; n < this.layers.length; n++) {
      this.layers[n].w.set(other.layers[n].w);
      this.layers[n].b.set(other.layers[n].b);
    }
  }
  weights() {
    return this.layers.map((l) => ({ w: Array.from(l.w), b: Array.from(l.b) }));
  }
  load(weights) {
    if (!Array.isArray(weights) || weights.length !== this.layers.length)
      throw Error("Wrong network shape");
    for (let n = 0; n < weights.length; n++)
      for (const key of ["w", "b"]) {
        const src = weights[n][key],
          dest = this.layers[n][key];
        if (
          !Array.isArray(src) ||
          src.length !== dest.length ||
          src.some(
            (v) =>
              typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 1e5,
          )
        )
          throw Error("Invalid brain weights");
        dest.set(src);
      }
    this.t = 0;
    for (const layer of this.layers)
      for (const key of ["mw", "vw", "mb", "vb"]) layer[key].fill(0);
  }
}

export class Learner {
  constructor(settings = {}) {
    this.settings = config(settings);
    const c = this.settings;
    this.rng = new RNG(c.seed + 1);
    this.game = new Snake(c.seed, c);
    const sizes = [11, ...Array(c.depth).fill(c.hidden), 3];
    this.net = new Network(sizes, new RNG(c.seed + 2));
    this.target = new Network(sizes);
    this.target.copyFrom(this.net);
    this.memory = [];
    this.memoryIndex = 0;
    this.steps = 0;
    this.episodes = 0;
    this.updates = 0;
    this.best = 0;
    this.loss = null;
    this.history = [];
    this.simulated = 0;
    this.lastDecision = null;
    this.lastEvent = "Ready for its first lesson";
    this.loaded = false;
  }
  epsilon() {
    const c = this.settings;
    return Math.max(
      c.epsilonMin,
      c.epsilonStart * c.epsilonDecay ** this.episodes,
    );
  }
  remember(experience) {
    if (this.memory.length < this.settings.memorySize)
      this.memory.push(experience);
    else {
      this.memory[this.memoryIndex] = experience;
      this.memoryIndex = (this.memoryIndex + 1) % this.settings.memorySize;
    }
  }
  step(training = true) {
    if (this.game.done) this.game.reset();
    const state = this.game.state(),
      q = this.net.predict(state),
      random = training && this.rng.next() < this.epsilon(),
      action = random ? this.rng.int(3) : argmax(q);
    this.lastDecision = {
      state,
      q: Array.from(q),
      action,
      random,
      activations: this.net.forward(state).map((a) => Array.from(a)),
    };
    if (training && this.settings.counterfactual) {
      for (let alternative = 0; alternative < 3; alternative++)
        if (alternative !== action) {
          this.remember({
            ...this.game.fork().step(alternative),
            simulated: true,
          });
          this.simulated++;
        }
    }
    const experience = this.game.step(action);
    this.lastEvent = experience.reason;
    this.lastReward = experience.reward;
    if (training) {
      this.steps++;
      this.remember({ ...experience, simulated: false });
      if (
        this.steps % 4 === 0 &&
        this.steps >= 64 &&
        this.memory.length >= Math.max(64, this.settings.batchSize * 2)
      ) {
        const batch = [];
        for (let k = 0; k < this.settings.batchSize; k++) {
          const e = this.memory[this.rng.int(this.memory.length)];
          const nextAction = argmax(this.net.predict(e.next));
          const target =
            e.reward +
            (e.done
              ? 0
              : this.settings.gamma * this.target.predict(e.next)[nextAction]);
          batch.push({ state: e.state, action: e.action, target });
        }
        this.loss = this.net.train(batch, this.settings.learningRate);
        this.updates++;
        if (this.updates % this.settings.targetEvery === 0)
          this.target.copyFrom(this.net);
      }
      if (experience.done) {
        this.episodes++;
        this.best = Math.max(this.best, this.game.score);
        this.history.push({
          episode: this.episodes,
          score: this.game.score,
          steps: this.game.steps,
          loss: this.loss,
          epsilon: this.epsilon(),
        });
        if (this.history.length > 3000) this.history.shift();
      }
    }
    return experience;
  }
  snapshot() {
    const recent = this.history.slice(-20);
    return {
      game: this.game.snapshot(),
      networkActivations: this.net.forward(this.game.state()).map(a => Array.from(a)),
      settings: this.settings,
      steps: this.steps,
      episodes: this.episodes,
      updates: this.updates,
      best: this.best,
      epsilon: this.epsilon(),
      loss: this.loss,
      memory: this.memory.length,
      simulated: this.simulated,
      average: recent.length
        ? recent.reduce((a, b) => a + b.score, 0) / recent.length
        : 0,
      history: this.history.slice(-180),
      decision: this.lastDecision,
      event: this.lastEvent,
      reward: this.lastReward ?? 0,
      loaded: this.loaded,
    };
  }
  export() {
    return {
      format: "nourah-snake-brain",
      version: 1,
      settings: this.settings,
      weights: this.net.weights(),
      training: {
        episodes: this.episodes,
        steps: this.steps,
        updates: this.updates,
        best: this.best,
        simulated: this.simulated,
      },
      note: "Policy checkpoint only. Replay memory and optimizer moments are not included.",
    };
  }
  static from(data) {
    if (data?.format !== "nourah-snake-brain" || data.version !== 1)
      throw Error("This is not a Snake Lab brain file");
    const l = new Learner(data.settings);
    l.net.load(data.weights);
    l.target.copyFrom(l.net);
    for (const key of ["episodes", "steps", "updates", "best", "simulated"]) {
      const v = data.training?.[key] ?? 0;
      if (!Number.isSafeInteger(v) || v < 0 || v > 1e9)
        throw Error("Invalid training metadata");
      l[key] = v;
    }
    l.loaded = true;
    return l;
  }
}
export function evaluate(
  net,
  settings,
  seeds = Array.from({ length: 20 }, (_, i) => 10001 + i),
  random = false,
) {
  const scores = [];
  for (const seed of seeds) {
    const game = new Snake(seed, settings),
      rng = new RNG(seed + 999999);
    while (!game.done)
      game.step(random ? rng.int(3) : argmax(net.predict(game.state())));
    scores.push(game.score);
  }
  return {
    games: scores.length,
    seeds,
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    best: Math.max(...scores),
    scores,
  };
}
