<p align="center">
  <img src="assets/img/utb-logo.svg" alt="University of Technology Bahrain" width="64">
</p>

<h1 align="center">Reinforcement Lab</h1>

<p align="center">
  <strong>An interactive, minimal website for learning reinforcement learning: grid mazes, Monte Carlo, temporal difference, Q-learning, actor–critic and the inverted pendulum.</strong><br>
  Companion to <em>CSIT843A Artificial Intelligence and Machine Learning, Lecture 5: Reinforcement Learning</em><br>
  College of Computer Studies · University of Technology Bahrain
</p>

<p align="center">
  <a href="https://saeedserwan.github.io/reinforcementlearning/"><strong>▶ Overview</strong></a> ·
  <a href="https://saeedserwan.github.io/reinforcementlearning/maze.html"><strong>The maze &amp; Monte Carlo</strong></a> ·
  <a href="https://saeedserwan.github.io/reinforcementlearning/td.html"><strong>Temporal difference</strong></a> ·
  <a href="https://saeedserwan.github.io/reinforcementlearning/policy.html"><strong>Policy gradients</strong></a> ·
  <a href="https://saeedserwan.github.io/reinforcementlearning/pendulum.html"><strong>Inverted pendulum</strong></a> ·
  <a href="https://saeedserwan.github.io/reinforcementlearning/brain.html"><strong>Brain &amp; limits</strong></a><br>
  <a href="https://saeedserwan.github.io/reinforcementlearning/code-qlearning.html">Q-learning in Python</a> ·
  <a href="https://saeedserwan.github.io/reinforcementlearning/code-pendulum.html">Pendulum in Python</a> ·
  <a href="notebooks/">Jupyter notebooks</a>
</p>

---

## Overview

Reinforcement Lab turns the lecture into something students can play with. They are the agent in the maze before any algorithm is shown; they watch returns being computed backwards, a Q-table filling in, three rats with three values of ε, Monte Carlo and TD side by side, SARSA and Q-learning on the cliff. Then they try to balance the pole themselves, and watch the 1983 actor–critic of Barto, Sutton and Anderson learn it from nothing but a −1 at each failure.

It follows the lecture, which follows the structure of Gonkee's video introduction to RL. It stays with classical, tabular reinforcement learning: grids and the inverted pendulum, no deep RL.

Everything runs in the browser: no installation, no sign-up, no server, no tracking. It also works offline once the repository is downloaded.

## What students learn

### 1 · Overview · [open](https://saeedserwan.github.io/reinforcementlearning/)

| Section | Key ideas |
|---|---|
| How would you teach a robot to tie a shoe? | supervised vs unsupervised vs reinforcement; milestones |
| Agent and environment | where the boundary is (learning to drive A/B/C); exercise with answers |
| The loop | **you are the agent**: play the maze with the arrow keys, then switch to the agent's view (numbers only) |
| The Markov property | a ball with position only vs position and velocity |
| The policy | probabilities, sampled 100 times |
| The return | γ slider (weights, horizon), returns computed backwards from editable rewards |

### 2 · The maze & Monte Carlo · [open](https://saeedserwan.github.io/reinforcementlearning/maze.html)

World models (what we see vs what the agent sees), the random rat (one episode or 1,000), the lucky trajectory and its returns step by step, value functions, "a value is an average" (same Q, different risk), the Q-table updated entry by entry, ε-greedy with three rats, **Monte Carlo control trained live** on an editable maze, and the credit-assignment exercise.

### 3 · Temporal difference · [open](https://saeedserwan.github.io/reinforcementlearning/td.html)

Monte Carlo vs TD side by side on the same trajectory, a TD-error calculator, driving home (Sutton & Barto, Example 6.1), one experience three updates (SARSA, Expected SARSA, Q-learning), **SARSA vs Q-learning on the cliff**, the race of all four methods on the small and big maze (with an optional head start for Monte Carlo), Q-learning one step at a time with the arithmetic, eligibility traces with a λ slider, and value iteration on an editable maze.

### 4 · Policy gradients & actor–critic · [open](https://saeedserwan.github.io/reinforcementlearning/policy.html)

The baseline problem (rewards shifted by up to +100), why it never mattered for Q-learning, the objective J and its definitions, the policy gradient read piece by piece, softmax tug of war, learning a continuous action (a bell curve that moves), the advantage ladder ending at the TD error, **an actor–critic learning the maze live**, and the three families compared.

### 5 · The inverted pendulum · [open](https://saeedserwan.github.io/reinforcementlearning/pendulum.html)

**Balance the pole yourself** (slow motion available), the equations of motion, the two reward conventions, hand-written rules (with a k·θ̇ slider), the BOXES decoder live, Q-learning on the 162 boxes, the sign rule (r̂ × e), the first failure step by step with signed eligibilities and Δw, the critic warning before the fall, **the full ASE/ACE trained live** (watch every trial or fast), what the actor and critic learned, and a 3 × 10-seed comparison.

### 6 · Brain & limits · [open](https://saeedserwan.github.io/reinforcementlearning/brain.html)

Dopamine and the TD error (trial slider, one or two cues, juice withheld), actor and critic in the striatum, results depend on luck (ten seeds), sample inefficiency, world models (the tennis-ball demo), demonstrations (behavioural cloning and DAgger in the big maze), the lecture in eight lines, and references.

### 7 · Python walkthroughs

Two executed Jupyter notebooks, presented on the site with hover-to-explain code. Only NumPy and Matplotlib are needed.

- **[Q-learning in Python](https://saeedserwan.github.io/reinforcementlearning/code-qlearning.html)** · `notebooks/qlearning_maze.ipynb` · the maze as an environment, random episodes, returns, Monte Carlo control, Q-learning, learning curves, greedy policy, the big maze.
- **[Pendulum in Python](https://saeedserwan.github.io/reinforcementlearning/code-pendulum.html)** · `notebooks/pendulum_ase_ace.ipynb` · cart-pole physics, hand-written rules, the 162 boxes, the ASE/ACE actor–critic, what it learned, actor alone vs actor + critic.

Both can be opened in Google Colab from their pages. Every lesson page ends with a short quiz with instant explanations.

## Run it locally

Open `index.html` in any modern browser. That's it.

To change a lesson page, edit its body in `tools/pages/<page>.html` and rebuild the pages:

```bash
python tools/build_pages.py
```

To rebuild the two Python walkthrough pages after editing `tools/walkthrough_content.py`:

```bash
pip install numpy matplotlib nbformat nbclient ipykernel markdown pillow
python tools/build_walkthroughs.py
```

## Publish on GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / root. The site will appear at `https://<user>.github.io/reinforcementlearning/`.

## Structure

```
index.html  maze.html  td.html  policy.html  pendulum.html  brain.html     interactive lessons (built from tools/pages/)
code-qlearning.html  code-pendulum.html                                    generated walkthroughs
assets/css/style.css                                                       the minimal design
assets/js/lib.js                                                           grid worlds, algorithms, cart-pole, plotting and UI helpers
assets/js/{overview,maze,td,policy,pendulum,brain,walkthrough}.js          one script per page
notebooks/  tools/
```

All algorithms (Monte Carlo control, SARSA, Expected SARSA, Q-learning, SARSA(λ), value iteration, REINFORCE, one-step actor–critic, the cart-pole simulator, the BOXES decoder, Q-learning on boxes and the ASE/ACE actor–critic) are written from scratch in plain JavaScript in `assets/js/lib.js` and the page scripts, with no libraries, so students can read them. Maths is typeset with KaTeX (bundled).

## Sources

Gonkee (2024), *The fastest introduction to reinforcement learning on the internet* (video) · Sutton & Barto (2018), *Reinforcement Learning: An Introduction* · Barto, Sutton & Anderson (1983) · Michie & Chambers (1968) · Watkins & Dayan (1992) · Schultz, Dayan & Montague (1997) · Takahashi, Schoenbaum & Niv (2008). All mazes, experiments and figures are our own.

## Author

**Eng. Saeed Serwan Abdulsattar**, College of Computer Studies, University of Technology Bahrain.

Released under the MIT License.
