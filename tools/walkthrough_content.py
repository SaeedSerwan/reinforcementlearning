"""
Content for the two code-walkthrough lessons (Q-learning in Python, Pendulum in Python).

Each lesson is a list of cells:
  ("md",   "markdown text")
  ("code", "python code")

Inside a code cell, a line may end with   # >> explanation   to attach a
line-by-line explanation. A line ending with   # >>^   shares the explanation
of the line above (used for statements that span several lines).

tools/build_walkthroughs.py turns this into a Jupyter notebook (executed, with
outputs) and an HTML page for the website, so the two always match.
Only NumPy and Matplotlib are needed.

Author: Eng. Saeed Serwan Abdulsattar
"""

STYLE = '''plt.rcParams["figure.figsize"] = (7, 4)  # >> Default figure size (width, height) in inches.
plt.rcParams["axes.spines.top"] = False  # >> A cleaner look: hide the top and right borders of every chart.
plt.rcParams["axes.spines.right"] = False  # >>^
plt.rcParams["axes.grid"] = True  # >> Light grid lines make values easier to read.
plt.rcParams["grid.color"] = "#ececec"  # >>^'''

QLEARNING = {
    "slug": "qlearning",
    "page": "code-qlearning.html",
    "notebook": "qlearning_maze.ipynb",
    "eyebrow": "Practice · Q-learning in Python",
    "title": "The maze and Q-learning, <em>line by line.</em>",
    "doc_title": "Monte Carlo and Q-learning on a Grid Maze in Python, Line by Line",
    "lead": "A complete, runnable notebook that builds the small maze of the lecture as an environment, samples random episodes, computes returns, "
            "and learns a Q-table with Monte Carlo and with Q-learning. Then both methods are compared on the big maze. "
            "Only NumPy and Matplotlib are needed. Hover over (or tap) any line of code to see what it does.",
    "learn": [
        "Write a grid maze as an environment with reset() and step()",
        "Sample random episodes and compute returns backwards",
        "Implement Monte Carlo control with an ε-greedy policy",
        "Implement Q-learning in a dozen lines",
        "Compare learning curves and read the learned policy",
    ],
    "cells": [
        ("md", """## 1. Import the libraries

**NumPy** for arrays and random numbers, **Matplotlib** for charts. Nothing else: every algorithm is written out by hand."""),
        ("code", """%config InlineBackend.figure_format = "retina"  # >> A Jupyter setting (not Python): sharper plots on high-resolution screens.
import numpy as np  # >> NumPy: arrays, maths and random numbers. `np` is the standard nickname.
import matplotlib.pyplot as plt  # >> Matplotlib's plotting interface, used for every chart.

""" + STYLE),

        ("md", """## 2. The maze as an environment

An environment only needs two functions. `reset()` starts an episode and returns the first state. `step(action)` applies an action and returns **the next state, the reward, and whether the episode is over**. The agent will see nothing else.

States are `(column, row)` with row 1 at the bottom, as in the lecture. Actions: 0 up, 1 down, 2 left, 3 right."""),
        ("code", """class Maze:  # >> A class bundles the maze's data (size, walls) with its two functions.
    MOVES = {0: (0, 1), 1: (0, -1), 2: (-1, 0), 3: (1, 0)}  # >> How each action changes (column, row): up, down, left, right.

    def __init__(self, width, height, walls, start, target, max_steps):  # >> Store the layout of one maze.
        self.width, self.height = width, height  # >>^
        self.walls, self.start, self.target = set(walls), start, target  # >>^
        self.max_steps = max_steps  # >> Episodes are cut off after this many steps.

    def reset(self):  # >> Start a new episode: put the rat on the start square.
        self.state, self.t = self.start, 0  # >>^
        return self.state  # >>^

    def step(self, action):  # >> One time step of the MDP.
        dc, dr = self.MOVES[action]  # >> The change in column and row for this action.
        nxt = (self.state[0] + dc, self.state[1] + dr)  # >> Where the rat would end up.
        inside = 1 <= nxt[0] <= self.width and 1 <= nxt[1] <= self.height  # >> Still on the grid?
        if inside and nxt not in self.walls:  # >> A move into a wall or off the grid leaves the rat where it is.
            self.state = nxt  # >>^
        self.t += 1  # >> Count the step.
        reached = self.state == self.target  # >> Did we enter the cheese square?
        reward = 0.0 if reached else -1.0  # >> 0 for reaching the target, −1 for every other step.
        done = reached or self.t >= self.max_steps  # >> The episode ends at the target or at the time limit.
        return self.state, reward, done  # >> Exactly what the agent receives.

small = Maze(5, 3, walls=[(3, 1), (3, 2)], start=(1, 1), target=(5, 1), max_steps=20)  # >> The small maze of the lecture: one wall, shortest route 8 moves.
big = Maze(9, 6, walls=[(3, 1), (3, 2), (3, 3), (3, 4), (5, 3), (5, 4), (5, 5), (5, 6),  # >> The big maze: three walls, shortest route 22 moves.
                        (7, 1), (7, 2), (7, 3), (7, 4)], start=(1, 1), target=(9, 1), max_steps=60)  # >>^
print("small maze:", small.width, "x", small.height, " big maze:", big.width, "x", big.height)  # >> A quick check."""),

        ("md", """## 3. Random actions and trajectories

With no knowledge, the agent can only pick actions at random. We record each **trajectory** (state, action, reward, …) and count how often the rat reaches the cheese by luck."""),
        ("code", """rng = np.random.default_rng(0)  # >> A random-number generator with a fixed seed, so the results are repeatable.

def run_random_episode(env):  # >> Play one episode with random actions and record it.
    s, trajectory, done = env.reset(), [], False  # >> Start, and an empty list for the trajectory.
    while not done:  # >> Until the target or the time limit.
        a = rng.integers(4)  # >> A random action 0–3: every action has probability ¼.
        s2, r, done = env.step(a)  # >> Ask the environment what happens.
        trajectory.append((s, a, r))  # >> Write it down: this is sampling.
        s = s2  # >> Move on.
    return trajectory  # >>^

episodes = [run_random_episode(small) for _ in range(2000)]  # >> Sample 2,000 random episodes.
totals = [sum(r for _, _, r in ep) for ep in episodes]  # >> The total reward of each episode.
reached = sum(1 for ep in episodes if ep[-1][2] == 0)  # >> Episodes that ended at the cheese (reward 0 on the last step).
print(f"reached the cheese in {reached} of 2000 episodes ({reached / 20:.1f}%)")  # >> Only a few percent: luck.

plt.hist(totals, bins=np.arange(-20.5, 0, 1), color="#2a78d6")  # >> How the total rewards are spread.
plt.xlabel("total reward of the episode"); plt.ylabel("episodes")  # >> Axis labels.
plt.title("2,000 random episodes on the small maze")  # >>^
plt.show()  # >> Most episodes are cut off at −20."""),

        ("md", """## 4. Returns, computed backwards

With $G_t = R_{t+1} + \\gamma\\, G_{t+1}$, the return of every step is easiest to compute from the **end**. Here is a lucky trajectory."""),
        ("code", """def returns(rewards, gamma):  # >> Return of every step of one episode.
    G, out = 0.0, []  # >> After the last step nothing follows: start with G = 0.
    for r in reversed(rewards):  # >> Walk backwards through the rewards.
        G = r + gamma * G  # >> G_t = R_{t+1} + γ G_{t+1}
        out.append(G)  # >>^
    return out[::-1]  # >> Put them back in time order.

lucky = next(ep for ep in episodes if ep[-1][2] == 0)  # >> The first random episode that reached the cheese.
G = returns([r for _, _, r in lucky], gamma=0.8)  # >> Its returns with γ = 0.8.
for t, ((s, a, r), g) in enumerate(zip(lucky, G)):  # >> Print one row per step.
    print(f"t={t:2d}  state={s}  action={'↑↓←→'[a]}  R={r:4.0f}  G={g:6.2f}")  # >> Even a successful episode has negative returns."""),

        ("md", """## 5. ε-greedy and Monte Carlo control

The Q-table has one entry per square and action. **ε-greedy**: with probability ε pick a random action, otherwise the action with the highest Q. **Monte Carlo control** plays a whole episode, then moves every visited entry a step α towards its return. ε falls from 0.9 to 0.1."""),
        ("code", """def epsilon_greedy(Q, s, eps, rng):  # >> Choose an action for state s.
    if rng.random() < eps:  # >> With probability ε…
        return int(rng.integers(4))  # >> …explore: a random action.
    q = Q[s]  # >> Otherwise exploit: the four values of this square.
    return int(rng.choice(np.flatnonzero(q == q.max())))  # >> The best action (ties broken at random).

def monte_carlo(env, episodes=300, alpha=0.1, gamma=0.8, seed=0):  # >> Algorithm 1 of the lecture.
    rng = np.random.default_rng(seed)  # >> Each run gets its own random numbers.
    Q = {(c, r): np.zeros(4) for c in range(1, env.width + 1) for r in range(1, env.height + 1)}  # >> All entries 0 at the start.
    curve = []  # >> Total reward of every episode, to plot later.
    for ep in range(episodes):  # >> One iteration = one complete episode.
        eps = 0.9 - 0.8 * ep / (episodes - 1)  # >> ε decreases linearly from 0.9 to 0.1.
        s, done, traj = env.reset(), False, []  # >>^
        while not done:  # >> Generate the episode first…
            a = epsilon_greedy(Q, s, eps, rng)  # >>^
            s2, r, done = env.step(a)  # >>^
            traj.append((s, a, r)); s = s2  # >>^
        G = 0.0  # >> …then update, going backwards.
        for s, a, r in reversed(traj):  # >>^
            G = r + gamma * G  # >> The return from this step.
            Q[s][a] += alpha * (G - Q[s][a])  # >> Move the entry 10% of the way towards the return.
        curve.append(sum(r for _, _, r in traj))  # >> Record how well this episode went.
    return Q, curve  # >>^"""),

        ("md", """## 6. Q-learning

Q-learning updates after **every step**, towards one reward plus the best value of the next square: $Q(S,A) \\leftarrow Q(S,A) + \\alpha\\,[R + \\gamma \\max_a Q(S',a) - Q(S,A)]$. At the target there is no next square, so it counts as 0: the anchor."""),
        ("code", """def q_learning(env, episodes=300, alpha=0.1, gamma=0.8, seed=0):  # >> Algorithm 3 of the lecture.
    rng = np.random.default_rng(seed)  # >>^
    Q = {(c, r): np.zeros(4) for c in range(1, env.width + 1) for r in range(1, env.height + 1)}  # >> The same table of zeros.
    curve = []  # >>^
    for ep in range(episodes):  # >>^
        eps = 0.9 - 0.8 * ep / (episodes - 1)  # >> The same ε schedule as Monte Carlo, for a fair race.
        s, done, total = env.reset(), False, 0.0  # >>^
        while not done:  # >>^
            a = epsilon_greedy(Q, s, eps, rng)  # >> Explore or exploit.
            s2, r, done = env.step(a)  # >> One step of experience.
            at_target = s2 == env.target  # >> At the cheese, the next square's value is 0.
            target = r + (0.0 if at_target else gamma * Q[s2].max())  # >> The TD target: one reward + γ × best next value.
            Q[s][a] += alpha * (target - Q[s][a])  # >> The Q-learning update: no waiting for the end.
            s, total = s2, total + r  # >>^
        curve.append(total)  # >>^
    return Q, curve  # >>^"""),

        ("md", """## 7. The race on the small maze

Average 50 runs of each method, because one run proves little."""),
        ("code", """def average_curve(method, env, runs=50, episodes=300):  # >> Run a method many times and average the learning curves.
    return np.mean([method(env, episodes=episodes, seed=k)[1] for k in range(runs)], axis=0)  # >>^

def smooth(x, k=10):  # >> A running average to make the curves readable.
    return np.convolve(np.pad(x, (k - 1, 0), mode="edge"), np.ones(k) / k, mode="valid")  # >>^

mc = average_curve(monte_carlo, small)  # >> 50 runs of Monte Carlo.
ql = average_curve(q_learning, small)  # >> 50 runs of Q-learning.
plt.plot(smooth(mc), color="#c0392b", label="Monte Carlo")  # >> Red: Monte Carlo.
plt.plot(smooth(ql), color="#2a78d6", label="Q-learning")  # >> Blue: Q-learning.
plt.axhline(-7, ls="--", color="grey", lw=1, label="best possible (−7)")  # >> 8 moves: seven −1 and one 0.
plt.xlabel("episode"); plt.ylabel("total reward (average of 50 runs)"); plt.legend()  # >>^
plt.title("Small maze")  # >>^
plt.show()  # >>^
print(f"last 50 episodes: Monte Carlo {mc[-50:].mean():.2f}, Q-learning {ql[-50:].mean():.2f}")  # >> On this tiny maze the two end up close; the big maze below shows the real difference."""),

        ("md", """## 8. What did it learn?

Draw the maze and, in every square, the action with the highest Q: the **greedy policy**."""),
        ("code", """def plot_policy(env, Q, title):  # >> Draw the walls, the target and an arrow per square.
    fig, ax = plt.subplots(figsize=(env.width * 0.9, env.height * 0.9))  # >> One inch per square, roughly.
    for (c, r), q in Q.items():  # >> Visit every square.
        if (c, r) in env.walls:  # >> Walls: dark squares.
            ax.add_patch(plt.Rectangle((c - 0.5, r - 0.5), 1, 1, color="#3b414b")); continue  # >>^
        if (c, r) == env.target:  # >> The cheese square.
            ax.add_patch(plt.Rectangle((c - 0.5, r - 0.5), 1, 1, color="#fff2c2")); continue  # >>^
        dc, dr = Maze.MOVES[int(q.argmax())]  # >> The direction of the best action.
        ax.arrow(c - 0.25 * dc, r - 0.25 * dr, 0.4 * dc, 0.4 * dr, head_width=0.15, color="#2a78d6", length_includes_head=True)  # >>^
    ax.set_xlim(0.5, env.width + 0.5); ax.set_ylim(0.5, env.height + 0.5); ax.set_aspect("equal")  # >> Square cells.
    ax.set_xticks(range(1, env.width + 1)); ax.set_yticks(range(1, env.height + 1)); ax.grid(False)  # >> Column and row numbers.
    ax.set_title(title); plt.show()  # >>^

Q, _ = q_learning(small, seed=1)  # >> One run of Q-learning.
plot_policy(small, Q, "Q-learning: greedy policy after 300 episodes")  # >> Follow the arrows from (1,1): round the wall to the cheese.
print("Q at the start square (up, down, left, right):", np.round(Q[(1, 1)], 2))  # >> The best value is about −3.95: seven steps of −1, discounted."""),

        ("md", """## 9. The big maze

Shortest route 22 moves, episodes cut off at 60 steps. A random walk almost never reaches the cheese, so Monte Carlo has nothing to learn from. Q-learning learns from every step."""),
        ("code", """mc_big = average_curve(monte_carlo, big, runs=20, episodes=600)  # >> 20 runs of 600 episodes each.
ql_big = average_curve(q_learning, big, runs=20, episodes=600)  # >>^
plt.plot(smooth(mc_big), color="#c0392b", label="Monte Carlo")  # >>^
plt.plot(smooth(ql_big), color="#2a78d6", label="Q-learning")  # >>^
plt.axhline(-21, ls="--", color="grey", lw=1, label="best possible (−21)")  # >>^
plt.xlabel("episode"); plt.ylabel("total reward (average of 20 runs)"); plt.legend(); plt.title("Big maze")  # >>^
plt.show()  # >> Monte Carlo stays at −60: it never reaches the target.
Q_big, _ = q_learning(big, episodes=600, seed=3)  # >> One Q-learning run on the big maze…
plot_policy(big, Q_big, "Q-learning on the big maze")  # >> …and its greedy policy."""),

        ("md", """## 10. Try it yourself

1. Change `q_learning` into **SARSA**: choose the next action `a2` with `epsilon_greedy` *before* the update and use `Q[s2][a2]` instead of `Q[s2].max()`. Then really take `a2` in the next step.
2. Write **Expected SARSA**: replace the max by the average of `Q[s2]` weighted by the ε-greedy probabilities (the best action gets 1 − ε + ε/4).
3. Add a wall to `small` and see how the learned policy changes.
4. Try γ = 0.5 and γ = 0.99. What happens to the learning curves, and why?"""),
    ],
}

PENDULUM = {
    "slug": "pendulum",
    "page": "code-pendulum.html",
    "notebook": "pendulum_ase_ace.ipynb",
    "eyebrow": "Practice · Pendulum in Python",
    "title": "The inverted pendulum, <em>line by line.</em>",
    "doc_title": "The Inverted Pendulum and the ASE/ACE Actor–Critic in Python, Line by Line",
    "lead": "A complete, runnable notebook that simulates the cart-pole, tests hand-written rules, cuts the state into 162 boxes and trains the "
            "1983 actor–critic of Barto, Sutton and Anderson from nothing but a −1 at each failure. Only NumPy and Matplotlib are needed. "
            "Hover over (or tap) any line of code to see what it does.",
    "learn": [
        "Simulate the cart-pole from its equations of motion",
        "See why the obvious hand-written rule fails",
        "Turn four continuous numbers into one of 162 boxes",
        "Implement the ASE/ACE actor–critic with signed eligibility traces",
        "Read what the actor and the critic have learned",
    ],
    "cells": [
        ("md", """## 1. Import the libraries"""),
        ("code", """%config InlineBackend.figure_format = "retina"  # >> A Jupyter setting (not Python): sharper plots on high-resolution screens.
import numpy as np  # >> NumPy: arrays, maths and random numbers.
import matplotlib.pyplot as plt  # >> Matplotlib: every chart.

""" + STYLE),

        ("md", """## 2. The cart-pole

Four numbers describe the system: cart position `x`, cart velocity `xd`, pole angle `th` (radians, 0 = upright) and angular velocity `thd`. Every 0.02 s the controller pushes with +10 N or −10 N. These equations are the **world model**; the learner will never see them."""),
        ("code", """G, M_CART, M_POLE, L_HALF, FORCE, TAU = 9.8, 1.0, 0.1, 0.5, 10.0, 0.02  # >> The constants of Barto, Sutton & Anderson (1983), also used by Gymnasium.

def step(state, push_right):  # >> Move the system forward by one time step (0.02 s).
    x, xd, th, thd = state  # >> Unpack the four numbers.
    f = FORCE if push_right else -FORCE  # >> The only thing the controller decides.
    cos, sin, total = np.cos(th), np.sin(th), M_CART + M_POLE  # >> Short names for the formulas below.
    temp = (f + M_POLE * L_HALF * thd**2 * sin) / total  # >> Equations of motion: the pole's angular acceleration…
    thacc = (G * sin - cos * temp) / (L_HALF * (4 / 3 - M_POLE * cos**2 / total))  # >>^
    xacc = temp - M_POLE * L_HALF * thacc * cos / total  # >> …and the cart's acceleration.
    return (x + TAU * xd, xd + TAU * xacc, th + TAU * thd, thd + TAU * thacc)  # >> One small Euler step forward.

def failed(state):  # >> Failure: pole more than 12° from vertical, or cart off the 2.4 m track.
    return abs(state[0]) > 2.4 or abs(state[2]) > np.radians(12)  # >>^

s, t = (0.0, 0.0, np.radians(1), 0.0), 0  # >> Start with the pole at 1° and do nothing clever:
while not failed(s):  # >> push left and right alternately until the pole falls.
    s, t = step(s, t % 2 == 0), t + 1  # >>^
print(f"alternating pushes: fell after {t} steps ({t * TAU:.2f} s)")  # >> Left alone, it falls in well under a second."""),

        ("md", """## 3. Hand-written rules

The obvious rule, "push towards the side the pole leans", overcorrects. Adding the angular velocity, reacting to where the pole is *going*, keeps it up."""),
        ("code", """def run_rule(rule, theta0_deg=2.0, max_steps=1000):  # >> Run one trial with a fixed rule; return the angle history.
    s, angles = (0.0, 0.0, np.radians(theta0_deg), 0.0), []  # >>^
    for _ in range(max_steps):  # >>^
        s = step(s, rule(s))  # >> The rule looks at the state and decides the push.
        angles.append(np.degrees(s[2]))  # >>^
        if failed(s): break  # >> Stop at failure.
    return angles  # >>^

lean = lambda s: s[2] > 0  # >> Rule 1: push right if the pole leans right.
lean_and_speed = lambda s: s[2] + 0.5 * s[3] > 0  # >> Rule 2: also look at how fast it is turning.
for rule, name, col in [(lean, "push towards the lean", "#c0392b"), (lean_and_speed, "θ + 0.5·θ̇ > 0", "#2a78d6")]:  # >> Plot both.
    a = run_rule(rule)  # >>^
    plt.plot(a, color=col, label=f"{name}: {len(a)} steps")  # >>^
plt.axhline(12, ls="--", color="grey", lw=1); plt.axhline(-12, ls="--", color="grey", lw=1)  # >> The failure limits.
plt.xlim(0, 300); plt.xlabel("time step"); plt.ylabel("pole angle (degrees)"); plt.legend()  # >>^
plt.show()  # >> Rule 1's swings grow until it falls; rule 2 stays near vertical."""),

        ("md", """## 4. The boxes

Each variable is cut into a few intervals: 3 × 3 × 6 × 3 = **162 boxes**. The learner is told only the box number."""),
        ("code", """def get_box(state):  # >> The decoder: four numbers → one of 162 boxes (numbered as in the lecture).
    x, xd, th, thd = state  # >>^
    bx = 0 if x < -0.8 else 1 if x < 0.8 else 2  # >> Cart position: left, middle, right.
    bxd = 0 if xd < -0.5 else 1 if xd < 0.5 else 2  # >> Cart velocity: moving left, slow, moving right.
    edges = np.radians([-6, -1, 0, 1, 6])  # >> Angle: finer near the vertical.
    bt = int(np.searchsorted(edges, th, side="right"))  # >> Which of the six angle intervals (0–5).
    btd = 0 if thd < np.radians(-50) else 1 if thd < np.radians(50) else 2  # >> Angular velocity: falling left fast, slow, falling right fast.
    return bx + 3 * bxd + 9 * bt + 54 * btd  # >> Combine the four interval numbers into one box number 0–161.

print("upright and still:", get_box((0, 0, 0.0, 0)), "  leaning 8° right and falling right fast:", get_box((0, 0, np.radians(8), 1.5)))  # >> Two examples."""),

        ("md", """## 5. The ASE/ACE actor–critic

Each box has a **weight** `w` (the actor's preference: positive pushes right) and a **prediction** `v` (the critic: 0 = safe, −1 = failure near). The actor's eligibility `e` is **signed**: it remembers which way the box pushed recently. The critic's TD error `r_hat` tells the actor whether to repeat or reverse what it did."""),
        ("code", """def train(seed, critic=True, max_trials=400, solved=20000):  # >> Algorithm 5 of the lecture. Returns the trial lengths and the learned tables.
    rng = np.random.default_rng(seed)  # >>^
    alpha, beta, gamma, lam, lam_v = 1000.0, 0.5, 0.95, 0.9, 0.8  # >> The parameters of the 1983 paper.
    w, v = np.zeros(162), np.zeros(162)  # >> Actor weights and critic predictions, all zero.
    lengths = []  # >> Steps survived in each trial.
    for trial in range(max_trials):  # >> One trial = from upright until the pole falls.
        s, e, xbar = (0.0, 0.0, 0.0, 0.0), np.zeros(162), np.zeros(162)  # >> Reset the cart and both traces.
        box, t = get_box(s), 0  # >>^
        while True:  # >>^
            p_right = 1 / (1 + np.exp(-np.clip(w[box], -50, 50)))  # >> σ(w): the probability of pushing right in this box.
            y = 1.0 if rng.random() < p_right else 0.0  # >> 1 = right, 0 = left.
            e[box] += (1 - lam) * (y - 0.5)  # >> Signed eligibility: + if it pushed right, − if left.
            xbar[box] += 1 - lam_v  # >> The critic's trace has no sign.
            s = step(s, y == 1.0); t += 1  # >> Apply the push.
            fail = failed(s)  # >>^
            r = -1.0 if fail else 0.0  # >> The only external signal: −1 at failure.
            new_box = None if fail else get_box(s)  # >>^
            p_new = 0.0 if fail else v[new_box]  # >> After a failure there is no next box.
            r_hat = (r + gamma * p_new - v[box]) if critic else r  # >> The internal reinforcement = the TD error. Without a critic: the raw r.
            w += alpha * r_hat * e  # >> Every box: Δw = α · r̂ · e. Sign of r̂ × sign of e = the direction of the correction.
            if critic: v += beta * r_hat * xbar  # >> The critic learns its predictions by TD(0).
            e *= lam; xbar *= lam_v  # >> All traces fade.
            box = new_box  # >>^
            if fail or t >= solved: break  # >> End of the trial.
        lengths.append(t)  # >>^
        if t >= solved: break  # >> Balanced for 400 s: solved.
    return lengths, w, v  # >>^

lengths, w, v = train(seed=13)  # >> Train once.
print(f"solved after {len(lengths) - 1} failures" if lengths[-1] >= 20000 else "not solved in 400 trials")  # >>^
plt.semilogy(range(1, len(lengths) + 1), lengths, "o", ms=3.5, color="#c0392b")  # >> Steps per trial, on a log scale.
plt.axhline(20000, ls="--", color="#1baf7a", lw=1)  # >> The "solved" line.
plt.xlabel("trial"); plt.ylabel("steps before failing (log scale)"); plt.title("ASE/ACE learning to balance")  # >>^
plt.show()  # >>^"""),

        ("md", """## 6. What did it learn?

A slice through the 162 boxes: cart in the middle and slow. Columns are the pole angle, rows the angular velocity."""),
        ("code", """angles = ["<−6°", "−6…−1°", "−1…0°", "0…1°", "1…6°", ">6°"]  # >> Column labels.
speeds = ["falling left fast", "slow", "falling right fast"]  # >> Row labels.
idx = np.array([[1 + 3 * 1 + 9 * bt + 54 * btd for bt in range(6)] for btd in range(3)])  # >> The box numbers of the slice (bx = 1, bxd = 1).
fig, axes = plt.subplots(1, 2, figsize=(10, 3))  # >> Two heat maps side by side.
axes[0].imshow(np.sign(w[idx]), cmap="coolwarm_r", vmin=-1, vmax=1)  # >> Actor: blue = push right, red = push left (white: never visited).
axes[0].set_title("actor: learned push")  # >>^
axes[1].imshow(v[idx], cmap="Reds_r", vmin=-0.6, vmax=0)  # >> Critic: darker = more dangerous.
axes[1].set_title("critic: predicted danger p")  # >>^
for ax in axes:  # >> Labels on both maps.
    ax.set_xticks(range(6)); ax.set_xticklabels(angles, fontsize=8); ax.set_yticks(range(3)); ax.set_yticklabels(speeds, fontsize=8); ax.grid(False)  # >>^
plt.tight_layout(); plt.show()  # >> Falling fast → push in the direction of the fall: the hand-written rule 2, found from failures alone."""),

        ("md", """## 7. Does the critic matter?

Run the actor alone (raw failure signal) and the full actor–critic with ten seeds each."""),
        ("code", """for critic in (False, True):  # >> Compare the two versions.
    results = []  # >>^
    for seed in range(1, 11):  # >> Ten different random seeds.
        L, _, _ = train(seed, critic=critic)  # >>^
        results.append(len(L) - 1 if L[-1] >= 20000 else None)  # >> Failures needed, or None if not solved in 400 trials.
    ok = [x for x in results if x is not None]  # >>^
    name = "actor + critic" if critic else "actor alone   "  # >>^
    print(f"{name}: solved {len(ok)}/10" + (f", median {int(np.median(ok))} failures" if ok else ""))  # >> The critic makes the difference."""),

        ("md", """## 8. Try it yourself

1. Change `lam` (the actor's trace decay) to 0.5 and to 0.99. How does it change the number of failures needed?
2. Start every trial from a small random state instead of upright. Does it still learn?
3. Implement Q-learning on the same boxes (a table `Q[162, 2]`, reward −1 at failure, no ε) and compare it with the actor–critic.
4. Change the reward: −1 at failure **and** a small penalty for large angles. Is the trained controller calmer?"""),
    ],
}

LESSONS = [QLEARNING, PENDULUM]
