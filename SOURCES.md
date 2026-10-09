# Sources, ideas and credits

The browser implementation in `web/` was written independently for this project. No third-party code or runtime library is bundled. Standard reinforcement-learning methods are credited below; this project does not claim to invent DQN, Double DQN, replay, Adam, or model-based planning.

## GitHub references reviewed

- [Patrick Loeber’s Snake AI tutorial](https://github.com/patrickloeber/snake-ai-pytorch/tree/7ea69e6b79c59db731d8befc9ec174b075efc808): reviewed `agent.py` and `model.py`. The eleven-feature Snake representation and three relative actions are a familiar educational design used there. Its reviewed trainer uses a single Q-network, Adam and MSE. This implementation uses independent JavaScript code, Huber loss, a separate target network, Double DQN targets and optional simulated alternative-action replay.
- [Andrej Karpathy’s REINFORCEjs](https://github.com/karpathy/reinforcejs/tree/08d2030d13b6a64ee4dd4ed75d1cd273a46aa8de): reviewed its documentation as inspiration for making reinforcement learning explorable in the browser. Its library is not imported or redistributed.
- [Google DeepMind’s DQN implementation](https://github.com/google-deepmind/dqn/tree/9d9b1d13a2b491d6ebd4d046740c511c662bbe0f): canonical implementation reference for experience replay and target networks; its Lua/Torch code is not part of this repository.

## Research foundations

- Mnih et al. (2015), [Human-level control through deep reinforcement learning](https://www.nature.com/articles/nature14236): DQN, experience replay and separate target values.
- van Hasselt, Guez and Silver (2016), [Deep Reinforcement Learning with Double Q-learning](https://arxiv.org/abs/1509.06461): separate action selection from target evaluation.
- Sutton (1991), [Dyna, an integrated architecture for learning, planning, and reacting](https://doi.org/10.1145/122344.122377): combining actual and simulated experience. Here the simulator is the exact Snake environment, not a learned world model.

The contribution claim is bounded: this project adds a controlled, simulator-assisted replay experiment to its original non-learning Snake prototype and goes beyond the specific tutorial training loop reviewed above. This is not a claim that other GitHub projects never implemented similar ideas, or that the method is new to research.

## SHAP / exact Shapley attribution

- [SHAP ExactExplainer documentation](https://shap.readthedocs.io/en/latest/generated/shap.ExactExplainer.html): exact feature attribution and explicit background masking for small feature sets.
- [Lundberg & Lee, A Unified Approach to Interpreting Model Predictions](https://arxiv.org/abs/1705.07874): SHAP framework.

The lab independently implements the standard Shapley formula in JavaScript for a single zero reference. It does not bundle or claim authorship of SHAP. Its contribution here is a reproducible, contrastive explanation of Snake action scores alongside the learning experiment.


## Current interface, visualization and accessibility · October 9, 2026

- [WCAG contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum): normal text should reach at least 4.5:1 contrast; large text at least 3:1. The new palette uses dark green surfaces and light text, retaining green for the game and highlights.
- [Material Design color roles](https://m3.material.io/styles/color/the-color-system): distinguishing surfaces from their foreground content informed the panel and text color roles. No Material library or assets are bundled.
- [MDN SVG tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial): SVG is the browser standard used for the independently written network diagram.

The diagram uses actual current-board network activations, labels input/hidden/output layers and shows three action scores. Its lines illustrate connectivity, not learned weight magnitude; hidden layers display up to eight neurons. The enlarged dialog displays the same live model.

Automatic SHAP uses the same exact attribution calculation described above, refreshed at most twice per second during play without pausing learning. It describes a sampled board, not a causal guarantee or an explanation of random exploration. The all-zero reference and potentially invalid masked states remain limitations.

The current 24 × 24 grid differs from the original 12 × 12 experiment. The checkpoint and historical results remain credited to that earlier environment. The interface redesign is an educational presentation improvement, not evidence of a new algorithm or better performance.

