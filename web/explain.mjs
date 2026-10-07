// Exact baseline Shapley values. Independent implementation; no SHAP dependency.
// All coalitions are enumerated. Missing sensors use the explicit reference.
export function exactShapley(predict, state, reference = state.map(() => 0)) {
  const n = state.length;
  if (
    n < 1 ||
    n > 11 ||
    reference.length !== n ||
    [...state, ...reference].some((v) => !Number.isFinite(v))
  )
    throw Error("Expected 1–11 finite sensors and a matching reference");
  const count = 1 << n,
    values = new Float64Array(count);
  const sizes = new Uint8Array(count),
    factorial = [1];
  for (let i = 1; i <= n; i++) factorial[i] = factorial[i - 1] * i;
  for (let mask = 0; mask < count; mask++) {
    const input = state.map((v, i) => (mask & (1 << i) ? v : reference[i]));
    values[mask] = predict(input);
    if (!Number.isFinite(values[mask])) throw Error("Non-finite model output");
    if (mask) sizes[mask] = sizes[mask >> 1] + (mask & 1);
  }
  const contributions = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let mask = 0; mask < count; mask++) {
      if (mask & (1 << i)) continue;
      const k = sizes[mask];
      contributions[i] +=
        ((factorial[k] * factorial[n - k - 1]) / factorial[n]) *
        (values[mask | (1 << i)] - values[mask]);
    }
  }
  return {
    contributions,
    baseline: values[0],
    output: values[count - 1],
    residual:
      values[count - 1] - values[0] - contributions.reduce((a, b) => a + b, 0),
    evaluations: count,
    reference: [...reference],
    state: [...state],
  };
}
export function explainMove(net, state) {
  const q = Array.from(net.predict(state));
  const [chosen, alternative] = [0, 1, 2].sort((a, b) => q[b] - q[a]);
  const result = exactShapley((input) => {
    const scores = net.predict(input);
    return scores[chosen] - scores[alternative];
  }, Array.from(state));
  return { ...result, chosen, alternative, q };
}
