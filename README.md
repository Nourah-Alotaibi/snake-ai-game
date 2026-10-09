# Snake Learning Lab

**What’s the best way to learn something new? Gamify it!**

Snake was the first digital game I played on my mum’s old Nokia, and it stayed with me. When I first started studying AI, I built my own version to make unfamiliar concepts click—and it helped me ace my exams. That early prototype used simple movement rules. This version gives the little snake a neural network that actually learns.

Turn the knobs and see how rewards guide behavior, why exploration matters and how learning rate changes training. It’s a familiar, playful way to make abstract AI concepts click.

**[Play the learning lab](https://www.nora-alotaibi.com/snake-game/) · [Read the technical report](REPORT.md) · [Sources & credits](SOURCES.md)**

## Can it learn from a move it never made?

The lab uses Double DQN with an optional **“what if?” replay** extension. Before a real move, it copies the game and simulates the two alternatives. Those one-step experiences join replay memory without changing the real game. It is an application of model-based planning ideas, not a claim to have invented a new RL algorithm.

The contribution goes beyond presentation: an isolated simulator branch, real-versus-simulated experience tracking, and a controlled ablation with equal actual-game steps and optimizer updates. Extra simulation is disclosed rather than treated as free experience.

In the original **12 × 12 board experiment** (before the October 9 interface and 24 × 24 world update), across three training seeds and 50 evaluation games per trained model, the final mean was **20.07 apples/game for standard replay and 20.97 for what-if replay**. The extension won only one of the three seed comparisons and performed worse early on two seeds. That is a mixed result, not proof that it is better. [See every run, its budget and limitations](REPORT.md).

## Why did it turn? Ask SHAP.

SHAP updates automatically while playing (at most twice per second). Pause to study which danger, heading and food signals support the brain’s preferred move over its runner-up. The lab calculates exact baseline Shapley values across all 2,048 sensor combinations, shows a signed contribution chart and a plain-language takeaway, and includes the explanation in your exported diary. No extra package or paid API is needed.

## Current interface · October 9, 2026

![Current Snake Learning Lab: settings, a green snake, live network and SHAP](web/screenshots/snake-learning-lab.png)

- A 24 × 24 world, green Nokia-inspired snake and red apple.
- Charcoal surfaces with readable light text; light mode is also available.
- Slow playback from 1 move/second, defaulting to 2. Faster training and single-step inspection remain available.
- Settings and live network on the left, game in the center, live SHAP and move scores on the right.
- A question-mark tutorial, parameter help, and one optional “Go deeper” area for progress, testing, saving and references.
- A labeled **inputs → hidden layers → outputs** diagram with real activations and an expanded live view. Displayed connections show structure, not learned weight strengths; hidden layers display up to eight neurons each.
- Mobile uses a large board first, stacked panels and larger touch controls. Desktop main panels fit common laptop/monitor viewports; expanded details may need scrolling.

![Expanded neural network with three output scores](web/screenshots/snake-network.png)

![Live SHAP attributions and move scores](web/screenshots/snake-xai.png)

These are current application screenshots, not mockups. The included checkpoint learned on the old 12 × 12 world; its performance on the current board must be tested again. Historical ablation scores in REPORT.md are **not** scores for this revision.

## A first experiment

1. Press **Start learning** to begin from scratch, or **Load example snake** to load the built-in checkpoint—no upload required.
2. Use slow playback or **Single move**, predict the next move, and compare with the live explanation.
3. Change one parameter, then **Apply & reset brain**. This clears learning and progress; save first if needed.
4. Open **Go deeper** to compare the frozen policy with random moves on 20 matched seeds, or save/load your experiment.

[Read the project story](https://www.nora-alotaibi.com/blog/snake-learning-lab)

## Turn the knobs and ask better questions

- **Learning rate:** how much one correction changes the weights.
- **Curiosity / epsilon:** random exploration versus using current estimates; includes a decay and a floor.
- **Future thinking / gamma:** how much later rewards matter.
- **Network width and depth:** neurons and hidden layers that actually change the model.
- **Replay capacity and batch size:** how much it remembers and how many examples share an update.
- **Target refresh:** how often the stable reference network catches up.
- **Food, collision and distance rewards:** the objective you are teaching. The distance hint is explicit assistance.
- **What-if replay:** add two simulated alternatives or use the standard baseline.
- **Seed:** repeat the same training setup. Playback speed changes wall-clock pace, not the learning rules.

Preset buttons stage a single change. Apply settings starts a fresh brain. You can pause, take one step, watch without training, run a frozen comparison, and save or reload weights. Loaded checkpoints keep settings and policy weights; replay and optimizer history restart. The network visualizer shows real activations and Q-values, not decorative neurons or probabilities.

## Run locally

The browser lab has no npm dependencies, API keys or model downloads.

```sh
python -m http.server 8503 --directory web
```

Open **http://localhost:8503/** in a current Chrome, Edge or Firefox browser. Use a local HTTP server, not a `file://` tab, because module workers require it. Training runs in a worker and pauses when the page is hidden. Your data stays in the browser.

```sh
node --test tests/*.test.mjs
node scripts/ablation.mjs
```

Node 20+ runs the tests. The ablation script now uses the current 24 × 24 world; to reproduce the historical 12 × 12 results, use the earlier repository revision linked in REPORT.md. The automated tests cover numerical gradient checks, optimizer learning, game rules, seeded reproducibility, target-network isolation, frozen evaluation, parameter effects and counterfactual simulation. [Browser checks](results/browser-checks.json) cover real weight updates, mode switching, evaluation, save/load, controls and mobile layout.

## Where the story began

`Snake_AI_Game.py` preserves the original Python/Pygame prototype:

```sh
python -m pip install -r requirements.txt
python Snake_AI_Game.py
```

That older file still uses random and food-seeking rules; its learning-rate and neuron labels do not train a model. The actual neural-learning implementation is in `web/core.mjs`. This distinction is deliberate so the project’s history stays understandable.
