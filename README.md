# Snake AI Game

A Python and Pygame Snake demo with automatic movement and an on-screen panel for score, penalties, reward, exploration rate, and example AI settings.

## Run locally

Install Python, download this repository, and open a terminal in its folder.

```powershell
py -m pip install -r requirements.txt
py Snake_AI_Game.py
```

On systems without the Windows `py` launcher, use `python` or `python3` instead.

The snake moves automatically. Press **S** or close the window to stop. The game resets after a collision.

## Current behavior

The controller chooses between random exploration and a simple rule that moves toward the food. Exploration decreases during a run and resets after a collision.

The interface displays a learning rate of `0.001`, `128` neurons, and `2` layers. These are demonstration settings: the current script does not create or train a neural network, and the learning-rate and network-size values do not control training. The on-screen learning message is a static label.

## Files

- `Snake_AI_Game.py`: the original local game script.
- `requirements.txt`: the Pygame dependency.

No external images or model files are required.
