<p align="center">
  <img src="assets/img/utb-logo.svg" alt="University of Technology Bahrain" width="64">
</p>

<h1 align="center">Reinforcement Lab</h1>

<p align="center">
  <strong>Interactive reinforcement learning lab: grid mazes, Q-learning, actor–critic and the inverted pendulum.</strong>
</p>

<p align="center">
  <a href="https://saeedserwan.github.io/reinforcementlearning/"><strong>▶ Open the lab</strong></a>
</p>

---

## Lessons

| Page | What you can do |
|---|---|
| [Overview](https://saeedserwan.github.io/reinforcementlearning/) | Be the agent in a maze, see what the agent sees, explore the return and the discount factor γ |
| [The maze & Monte Carlo](https://saeedserwan.github.io/reinforcementlearning/maze.html) | Sample episodes, compute returns, fill a Q-table, see why too little exploration settles for less, train Monte Carlo live |
| [Temporal difference](https://saeedserwan.github.io/reinforcementlearning/td.html) | Monte Carlo vs TD side by side, the TD error, SARSA vs Q-learning on the cliff, eligibility traces, value iteration |
| [Policy gradients](https://saeedserwan.github.io/reinforcementlearning/policy.html) | The baseline problem, softmax and continuous actions, an actor–critic learning a maze |
| [Inverted pendulum](https://saeedserwan.github.io/reinforcementlearning/pendulum.html) | Balance the pole yourself, then watch Q-learning and the 1983 actor–critic learn it from failures alone |
| [Brain & limits](https://saeedserwan.github.io/reinforcementlearning/brain.html) | Dopamine and the TD error, luck, world models and learning from demonstrations |
| [Q-learning in Python](https://saeedserwan.github.io/reinforcementlearning/code-qlearning.html) · [Pendulum in Python](https://saeedserwan.github.io/reinforcementlearning/code-pendulum.html) | Runnable notebooks explained line by line |

## Run locally

Open `index.html` in a browser. No installation needed.

To rebuild the pages after editing `tools/pages/` or `tools/walkthrough_content.py`:

```bash
python tools/build_pages.py
pip install numpy matplotlib nbformat nbclient ipykernel markdown pillow
python tools/build_walkthroughs.py
```

## Author

**Eng. Saeed Serwan Abdulsattar** · University of Technology Bahrain · MIT License
