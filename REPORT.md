# Can a snake learn from a turn it never took?

**A technical project report · October 8, 2026**

What’s the best way to learn something new? Gamify it! Snake was the first digital game I played on my mum’s old Nokia. I built an early version when I first started studying AI, to connect unfamiliar concepts with something familiar. It helped the ideas click and helped me ace my exams. This revision asks a more technical question: can alternative-action experience help the learner?

## My contribution

I added **counterfactual one-step replay**, called “what if?” replay in the lab. Before the actual move, the environment is copied and each of the two unchosen actions is simulated once. Their state, action, reward, next state and terminal status enter the replay buffer alongside real experience. The real board and its random-number state are unchanged.

This is a simulator-assisted extension of Double DQN. It uses known game rules, including body positions hidden from the network’s compact observation. It is related to Dyna-style planning; it is not a new reinforcement-learning family or a learned imagination model. The useful contribution is the implementation, its verifiable separation of real and simulated experience, and the controlled ablation—not just a new interface.

The implementation also adds actual backpropagation and Adam, Huber loss, gradient clipping, a frozen target network, bounded replay, seeded runs, validated policy checkpoints, frozen evaluation, and tests for numerical gradients and simulator isolation. [Sources and bounded comparisons](SOURCES.md) distinguish these additions from established methods.

## Method

- World: 12 × 12 Snake, initial length 3, relative actions straight/right/left. Moving into a tail cell that is vacated on that step is legal. Food is placed only in empty cells.
- Observation: 11 binary signals—danger for three moves, current direction, food direction. This is partially observable; the network does not receive the whole body or pixels.
- Network: 11 → 32 → 32 → 3, ReLU hidden layers, linear Q outputs. Double DQN selects a next action with the online network and values it with a separate target network.
- Optimization: Adam at 0.001, mean Huber loss, global gradient-norm clipping at 10, batch 32; one update every four actual moves after 64 actual moves; target copied every 200 updates.
- Reward: +10 food, −10 collision/timeout, −0.01 per ordinary move, optional ±0.1 distance hint. The distance hint is designed assistance and is not potential-based shaping with a policy-invariance guarantee.
- Exploration: epsilon starts at 1, multiplied by 0.985 after each training game, floor 0.05. Episodes stop after 100 moves without food or 1,500 total moves.

## Controlled comparison

Both variants use training seeds **42, 7 and 123** and **12,000 actual moves each**. Network initialization, reward settings, replay capacity and optimizer cadence are matched. Both make **2,985 optimizer updates**. The extension adds **24,000 simulator branches**, so this is an interaction-budget comparison, **not equal environment-query or compute cost**. Replay warms up on the same actual-step schedule.

Intermediate evaluations use starting seeds 10001–10020 at 2,000, 6,000 and 12,000 moves. The final comparison uses a separate set of 50 starting seeds, 30001–30050. Evaluation freezes weights and uses greedy actions. Different policies consume randomness differently, so matching seeds does not mean identical subsequent food paths. These evaluation games are never training examples. Repeated use of evaluation seeds during future development would no longer constitute fresh validation.

### Final mean apples per game

| Training seed | Standard Double DQN | With “what if?” replay | Difference |
| --- | ---: | ---: | ---: |
| 42 | 20.06 | 24.06 | +4.00 |
| 7 | 19.82 | 19.44 | −0.38 |
| 123 | 20.32 | 19.42 | −0.90 |
| Mean of the three runs | 20.07 | 20.97 | +0.91 |

The average rose slightly, but the extension won only one of three final comparisons. **That is not convincing evidence of a general improvement.** Three training seeds are too few for a strong reliability claim, and the 50 evaluation games are not 50 independently trained models.

### Intermediate mean across the three runs

| Actual moves | Standard replay | “What if?” replay |
| --- | ---: | ---: |
| 2,000 | 11.73 | 6.53 |
| 6,000 | 14.38 | 17.38 |
| 12,000 | 21.13 | 21.50 |

Extra simulated experience did not uniformly accelerate learning. It changed the replay distribution and interacted with exploration. The extension struggled early on two seeds, then recovered. The saved browser example uses the predeclared seed 42 checkpoint; it illustrates the feature, while the table above exposes the other runs too.

## Reproduce and inspect

```sh
node --test tests/*.test.mjs
node scripts/ablation.mjs
```

The ablation saves every per-game evaluation score in [results/ablation.json](results/ablation.json), and the seed-42 training diary in [results/example-training.json](results/example-training.json). `web/trained.json` is the resulting policy checkpoint. Loading a checkpoint resets optimizer moments and replay; it is not exact training-state resumption. The original single-seed baseline check is separately recorded as `results/evaluation-42.json` and is not the basis for the ablation table.

Seventeen core tests cover finite-difference gradients, loss reduction, determinism, game boundaries, target synchronization, frozen evaluation, checkpoint validation, bounded replay and isolated counterfactual simulation. Browser checks additionally cover real learning updates, controls, pause/watch modes, trained example loading, evaluation, file export/import and mobile layout.

## What I would investigate next

The current replay pool mixes real and simulated transitions without balancing them, and the full simulator supplies privileged state. A useful follow-up would hold total simulator queries constant, separate replay sources with an explicit sampling ratio, and test more training seeds. Longer-horizon simulation and richer observations are separate hypotheses, not established improvements here.

The main lesson: a creative addition is stronger when it comes with a test that can show where it fails.

## Explainable decisions: exact baseline SHAP

The **Explain this board** button pauses the active game and explains the current greedy preference: Q(preferred action) minus Q(runner-up). The two actions are fixed before masking. A standalone JavaScript implementation enumerates all 2^11 coalitions and applies the exact Shapley factorial weights. Missing features use an explicit all-zero reference. Reference output plus all eleven contributions reconstructs the observed Q-gap (tested within 1e-9). This is baseline Shapley attribution, not a call to the Python SHAP package.

Blue contributions support the preferred action; gold contributions oppose it. The explanation concerns the network’s greedy scores, not an epsilon-random choice. It uses the current weights and current board without advancing the simulator, sampling the training RNG, updating weights or adding memories. Starting, stepping, loading, resetting or changing mode clears the old explanation. Exported diaries include the exact reference, sensor state, contributions and residual.

The all-zero reference is intentionally explicit, not a typical board or a data-distribution average. Independent masking can create invalid combinations of heading and food signals. These are attributions of model outputs under that reference, not causal effects in the world or a guarantee of a safe action. Changing the reference can change the attributions. This XAI addition is separate from the simulator-based alternative-action replay; neither is claimed as a newly invented algorithm.

Additional tests check known linear attributions with a nonzero reference, symmetric interaction splitting, dummy features, completeness on the real neural network, determinism and no training-state mutation.
