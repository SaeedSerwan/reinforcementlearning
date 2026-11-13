/* Hover explanations: keywords in the text and every part of every formula.
   Formulas: known parts are tagged before KaTeX renders them (\htmlData{tip=...}), so each part can be hovered.
   Hovering a part explains that part; hovering anywhere else on a display formula explains the whole formula, part by part. */
(function () {
  'use strict';
  const UL = window.UL;

  /* ------------------------------------------------------------------ formula parts */
  // [TeX to find, part id, optional core: the piece of `find` that gets tagged]. Longest first.
  const PAT = [
    ['\\nabla_\\theta \\log \\pi_\\theta(A_t \\mid S_t)', 'gradlog'], ['\\nabla_\\theta J(\\theta)', 'gradJ'],
    ['\\textstyle\\sum_{a\'} \\pi(a\'\\mid S\')', 'expect'], ['q_*(S_{t+1}, a\')', 'qstarNext'], ['q_*(s,a)', 'qstar'],
    ['q_\\pi(s,a)', 'qpi'], ['v_\\pi(s)', 'vpi'], ['\\mathbb{E}_\\pi', 'Epi'], ['\\mathbb{E}', 'E'], ['\\mathbb{1}[a = A]', 'one'],
    ['\\max_{a\'}', 'max'], ['\\sum_b e^{\\theta_b}', 'smden'], ['e^{\\theta_a}', 'smnum'], ['\\sum_t', 'sumt'],
    ['Q(S_t, A_t)', 'Qsa'], ['Q(S_t,A_t)', 'Qsa'], ['Q(S\',A\')', 'QnextA'], ['Q(S\',a\')', 'Qnexta'], ['Q(S,A)', 'Qsa'],
    ['V(S_{t+1})', 'Vnext'], ['V(S_t)', 'Vs'], ['V(S\')', 'Vnext'], ['V(S)', 'Vs'],
    ['\\pi(a \\mid s)', 'pias'], ['\\pi(a \\mid S)', 'pias'], ['\\theta(S, a)', 'thetaSa'], ['\\Psi_t', 'Psi'],
    ['p(\\text{new box})', 'pnew'], ['p(\\text{old box})', 'pold'], ['\\hat r', 'rhat'], ['y - \\tfrac12', 'push'],
    ['\\ddot\\theta', 'ddtheta'], ['\\ddot x', 'ddx'], ['\\dot\\theta^2', 'dtheta'], ['g\\sin\\theta', 'g', 'g'], ['F + m', 'F', 'F'], ['M+m', 'Mm'],
    ['e_i', 'ei'], ['w_i', 'wi'], ['x_i', 'xi'],
    ['G_{t+1}', 'Gnext'], ['G_t', 'Gt'], ['G \\leftarrow', 'Grun', 'G'], ['\\gamma\\, G', 'Grun', 'G'], ['(G - Q', 'Grun', 'G'],
    ['R_{t+1}', 'Rt1'], ['R_{t+2}', 'Rt2'], ['R_{t+3}', 'Rt3'], ['R + \\gamma', 'R', 'R'], ['r + \\gamma', 'rpend', 'r'],
    ['S_0', 'St'], ['S_1', 'St'], ['S_2', 'St'], ['A_0', 'At'], ['A_1', 'At'], ['A_2', 'At'], ['R_1', 'Rk'], ['R_2', 'Rk'], ['R_3', 'Rk'],
    ['T{-}1', 'T'], ['\\text{target}', 'target'], ['\\delta_t', 'delta'], ['\\delta', 'delta'],
    ['\\gamma^2', 'gamma2'], ['\\gamma', 'gamma'], ['\\alpha', 'alpha'], ['\\beta', 'beta'], ['\\lambda', 'lambda'],
    ['\\varepsilon', 'eps'], ['\\leftarrow', 'arrow'], ['\\mid', 'mid'],
  ];
  const SYM = {
    St: ['S_t', 'State at time t: what the agent observes. In the mazes it is the square the agent is on.'],
    At: ['A_t', 'Action at time t: the move the agent chooses (up, down, left or right).'],
    Rk: ['R_t', 'A reward: the number the environment hands back after an action.'],
    Rt1: ['R_{t+1}', 'The reward received right after acting at time t. It carries the index t+1 because it arrives one step later, together with the next state.'],
    Rt2: ['R_{t+2}', 'The reward one step further in the future.'],
    Rt3: ['R_{t+3}', 'The reward two steps further in the future.'],
    R: ['R', 'The reward of this single step, e.g. −1 for a move in the maze.'],
    Gt: ['G_t', 'The return from time t: the total discounted reward the agent collects from step t until the episode ends. This is what the agent tries to maximise.'],
    Gnext: ['G_{t+1}', 'The return from the next step on. Writing G_t through G_{t+1} lets you compute all returns in one backward pass.'],
    Grun: ['G', 'The running return, built up backwards from the last step of the episode.'],
    gamma: ['\\gamma', 'The discount factor, between 0 and 1. A reward k steps away counts γᵏ times as much as one now. Close to 1: far-sighted. Close to 0: only the next reward matters.'],
    gamma2: ['\\gamma^2', 'Two steps later, so the reward is shrunk by γ twice.'],
    alpha: ['\\alpha', 'The learning rate (step size): the fraction of the error corrected in one update. Small α learns slowly but averages out noise; large α reacts fast but jumps around.'],
    beta: ['\\beta', 'The critic’s learning rate: how fast the value estimates move.'],
    lambda: ['\\lambda', 'Trace decay: how quickly the memory of past visits fades. λ = 0 remembers only the current step; λ close to 1 keeps a long memory.'],
    delta: ['\\delta', 'The TD error: (reward + value of where you landed) minus what you expected before. Positive means better than expected, negative worse.'],
    eps: ['\\varepsilon', 'The exploration rate of ε-greedy: the probability of picking a random action instead of the best-looking one.'],
    arrow: ['\\leftarrow', '“Becomes”: overwrite the value on the left with the expression on the right. This is an update step, not an equation.'],
    mid: ['\\mid', '“Given”: everything to the right of the bar is assumed known.'],
    E: ['\\mathbb{E}', 'Expected value: the average over all randomness, both in the agent’s choices and in what the environment does.'],
    Epi: ['\\mathbb{E}_\\pi', 'Expected value when the agent follows policy π: the average over many runs of that policy.'],
    vpi: ['v_\\pi(s)', 'The state value: how much return you expect from state s if you follow policy π from there.'],
    qpi: ['q_\\pi(s,a)', 'The action value: how much return you expect if you take action a in state s, then follow π.'],
    qstar: ['q_*(s,a)', 'The optimal action value: the expected return of taking a in s and then acting perfectly.'],
    qstarNext: ['q_*(S_{t+1}, a\')', 'The optimal value of each possible action a′ in the next state.'],
    Qsa: ['Q(S,A)', 'The table entry being updated: the current estimate of how good it is to take action A in state S.'],
    QnextA: ['Q(S\',A\')', 'The estimated value of the next state S′ with the action A′ the agent will really take there.'],
    Qnexta: ['Q(S\',a\')', 'The estimated value of each possible action a′ in the next state.'],
    Vs: ['V(S)', 'The current estimate of how good the state is: the return the agent expects from here.'],
    Vnext: ['V(S\')', 'The current estimate of the next state’s value. Using your own guess inside the target is called bootstrapping.'],
    max: ['\\max_{a\'}', 'Take the best value over all next actions: assume the agent acts greedily from the next state on.'],
    expect: ['\\sum_{a\'} \\pi(a\'\\mid S\')', 'An average over all next actions, each weighted by how likely the policy is to choose it.'],
    target: ['\\text{target}', 'The value the old estimate is moved towards. SARSA, Expected SARSA and Q-learning each define it differently.'],
    T: ['T', 'The time step at which the episode ended.'],
    smnum: ['e^{\\theta_a}', 'The exponential makes the preference positive; a bigger preference gives a much bigger number.'],
    smden: ['\\sum_b e^{\\theta_b}', 'The sum over all actions. Dividing by it makes the numbers add up to 1, so they are probabilities.'],
    pias: ['\\pi(a \\mid s)', 'The policy: the probability of choosing action a in state s.'],
    gradJ: ['\\nabla_\\theta J(\\theta)', 'The gradient of the expected return J: the direction in which to change the parameters θ to improve fastest.'],
    gradlog: ['\\nabla_\\theta \\log \\pi_\\theta(A_t \\mid S_t)', 'The direction that makes the action actually taken more likely in that state.'],
    Psi: ['\\Psi_t', 'How good the action turned out to be: the return, the return minus a baseline, or the TD error.'],
    sumt: ['\\sum_t', 'Add up over every time step of the episode.'],
    thetaSa: ['\\theta(S, a)', 'The actor’s preference for action a in state S. The softmax turns preferences into probabilities.'],
    one: ['\\mathbb{1}[a = A]', 'Equals 1 for the action actually taken, 0 for the others.'],
    ddtheta: ['\\ddot\\theta', 'The angular acceleration of the pole.'],
    ddx: ['\\ddot x', 'The acceleration of the cart.'],
    dtheta: ['\\dot\\theta', 'The angular speed of the pole.'],
    g: ['g', 'Gravity, 9.8 m/s², which pulls the pole over.'],
    F: ['F', 'The push on the cart, ±10 N: the only thing the agent controls.'],
    Mm: ['M+m', 'Total mass of the cart (M = 1 kg) and the pole (m = 0.1 kg).'],
    ei: ['e_i', 'The eligibility trace of box i: a fading memory of recent visits to the box and of which way the cart was pushed there.'],
    wi: ['w_i', 'The actor’s weight for box i. Positive leans towards pushing right, negative towards left.'],
    xi: ['x_i', '1 if the system is in box i right now, otherwise 0.'],
    push: ['y - \\tfrac12', '+½ if the actor pushed right, −½ if it pushed left.'],
    rhat: ['\\hat r', 'The critic’s internal reinforcement: a TD error, available on every step instead of only at failure.'],
    rpend: ['r', 'The external reward: 0 on every step, −1 when the pole falls or the cart hits the end of the track.'],
    pnew: ['p(\\text{new box})', 'The critic’s prediction for the box just entered.'],
    pold: ['p(\\text{old box})', 'The critic’s prediction for the box just left.'],
  };
  // Whole display formulas: match = a piece of the source, then a title and a plain reading.
  const FORM = [
    ['S_0,\\ A_0', 'One episode as a sequence', 'Time runs left to right. In each step the agent sees a state S, picks an action A, and then receives a reward R together with the next state. The reward for the action at time t is called R_{t+1} because it arrives one step later.'],
    ['G_t = R_{t+1} + \\gamma R_{t+2}', 'The return', 'G_t adds up all future rewards, each later one shrunk by one more factor of γ. The right-hand form says the same thing recursively: the return now is the next reward plus γ times the return from the next step on. That is why returns are computed backwards.'],
    ['v_\\pi(s) =', 'State value and action value', 'v_π(s) is the average return if you start in s and follow π. q_π(s,a) is the same, but you first take action a. Both are averages over many possible futures.'],
    ['Q(S_t, A_t) \\leftarrow Q(S_t, A_t) + \\alpha\\,\\big(G_t', 'Move the estimate towards the sample', 'G_t − Q is the error: how much the return just observed differs from the stored estimate. Correct a fraction α of it. Repeated over many episodes this keeps a running average of the returns.'],
    ['\\text{for } t = T{-}1', 'Monte Carlo control after one episode', 'Walk backwards from the last step. Keep a running return G: at each step it becomes that step’s reward plus γ times the G of the step after. Then nudge that step’s table entry towards G.'],
    ['\\ddot\\theta =', 'The cart-pole physics', 'The simulator’s equations of motion (Barto, Sutton & Anderson, 1983): from the angle, the angular speed and the push F they give the pole’s angular acceleration and the cart’s acceleration. The learner never sees them; it only sees boxes and failures.'],
    ['e_i \\leftarrow \\lambda\\, e_i', 'The actor’s eligibility trace', 'Every step each trace fades by λ, and the active box records the push just made. When reinforcement arrives later, boxes with large traces receive most of the credit or blame.'],
    ['w_i \\leftarrow w_i + \\alpha', 'The actor’s weight update', 'A box’s weight changes in proportion to the critic’s signal r̂ and to the box’s trace, so only recently used boxes, in the direction they pushed, are reinforced or punished.'],
    ['\\hat r = r + \\gamma', 'The critic’s internal reinforcement', 'r̂ is a TD error: reward plus the discounted prediction for the new box, minus the prediction for the old box. Entering a box the critic considers dangerous is punished immediately, long before the pole falls.'],
    ['\\nabla_\\theta J(\\theta)', 'The policy gradient', 'Change θ so that each action taken becomes more likely, weighted by how good it turned out to be. Good actions are pushed up, bad ones down; averaged over many episodes this points uphill on the expected return.'],
    ['\\pi(a \\mid s) = \\frac', 'Softmax: preferences to probabilities', 'Each action has a preference θ_a. Exponentiating makes them positive; dividing by the sum makes them add up to 1. Higher preference means higher probability, but every action keeps some chance.'],
    ['\\delta &= R + \\gamma V(S\')', 'Actor–critic in three lines', 'The critic computes the TD error δ and corrects its value V(S). The actor uses the same δ: if positive, the action it just took becomes more likely; if negative, less likely.'],
    ['V(S_t) &\\leftarrow V(S_t)', 'TD(0)', 'Instead of waiting for the full return, use the next reward plus the current guess for the next state as the target. The gap between this target and the old value is the TD error δ.'],
    ['Q(S,A) \\leftarrow Q(S,A) + \\alpha\\,\\big[\\,\\text{target}', 'One update, three methods', 'SARSA, Expected SARSA and Q-learning all use this update. Only the target differs.'],
    ['\\text{SARSA:}', 'Three targets', 'All three start with the reward R and add γ times a value of the next state. SARSA uses the action really taken next, Expected SARSA averages over the policy, Q-learning takes the best action.'],
    ['q_*(s,a) =', 'The Bellman optimality equation', 'The optimal value of an action equals the expected reward plus the discounted value of the best action in the next state. Q-learning turns this equation into an update.'],
    ['\\delta_t = R_{t+1}', 'The TD error, or reward prediction error', 'What you got (reward plus the value of where you landed) minus what you expected. Dopamine neurons fire in a pattern that matches this signal.'],
  ];
  // per-formula meaning overrides for parts that mean something specific there
  const OVR = { '\\hat r = r + \\gamma': { gamma: 'Here γ = 0.95: the critic’s discount factor.' }, 'w_i \\leftarrow w_i + \\alpha': { alpha: 'Here α = 1000: the actor’s learning rate, large because traces and r̂ are small numbers.' }, 'e_i \\leftarrow \\lambda\\, e_i': { lambda: 'Here λ = 0.9: how long a box stays eligible after being visited.' } };

  UL.texTips = function (tex) {
    const slots = []; let s = tex;
    for (const [find, id, core] of PAT) {
      if (!s.includes(find)) continue;
      const c = core || find, i = find.indexOf(c), pre = find.slice(0, i), post = find.slice(i + c.length);
      s = s.split(find).join(pre + '\u0001' + slots.length + '\u0002' + post); slots.push(`\\htmlData{tip=${id}}{${c}}`);
    }
    return s.replace(/\u0001(\d+)\u0002/g, (_, n) => slots[+n]);
  };

  /* ------------------------------------------------------------------ keywords */
  // [term, aliases (regex sources, case-insensitive), explanation]
  const KW = [
    ['Agent', ['agents?'], 'The learner and decision maker. It observes a state, chooses an action and receives a reward, and its only goal is to collect as much reward as possible over time. In this lab it is the token in the maze or the controller of the cart.'],
    ['Environment', ['environments?'], 'Everything the agent cannot directly control: the maze, the physics of the cart, the rules that hand out rewards. It answers each action with a new state and a reward.'],
    ['State', ['states?'], 'A description of the situation that the agent uses to decide. In the mazes the state is the square the agent is on; for the cart-pole it is position, speed, angle and angular speed (or the box they fall into).'],
    ['Action', ['actions?'], 'A choice the agent can make in a state. Here: up, down, left or right in the maze, or push left / push right for the cart.'],
    ['Reward', ['rewards?'], 'A single number the environment returns after each action. It defines the task: the agent maximises the total reward, so whatever the reward encourages is what gets learned, intended or not.'],
    ['Return', ['returns?'], 'The total (discounted) reward from a time step until the end of the episode: G = R₁ + γR₂ + γ²R₃ + … The agent maximises the return, not the next reward.'],
    ['Discount factor γ', ['discount factor', 'discount(?:ed|ing)?'], 'A number between 0 and 1 that makes later rewards count less: a reward k steps away is multiplied by γᵏ. γ near 1 makes the agent patient and far-sighted, γ near 0 makes it greedy for immediate reward. It also keeps returns finite in long tasks.'],
    ['Episode', ['episodes?'], 'One complete run from the start until a terminal state (or a step limit): one walk through the maze, one balancing attempt. Learning usually takes hundreds of episodes.'],
    ['Policy', ['polic(?:y|ies)'], 'The agent’s strategy: a rule that says which action to take in each state, or with what probability. Written π(a | s). Learning in RL means improving the policy.'],
    ['Greedy', ['greedy'], 'Always choosing the action with the highest estimated value. Greedy behaviour exploits what the agent knows, but never tests whether something else is better.'],
    ['ε-greedy', ['ε-greedy', 'epsilon-greedy'], 'With probability ε pick a random action, otherwise pick the best-looking one. A simple way to keep exploring while mostly exploiting; ε is usually lowered as learning progresses.'],
    ['Exploration', ['exploration', 'explor(?:e|es|ing)'], 'Trying actions that do not currently look best, to find out whether they are actually better. Without enough exploration the agent can settle for a mediocre policy and never discover the better one.'],
    ['Exploitation', ['exploitation', 'exploit(?:s|ing)?'], 'Using what the agent already knows: choosing the action that currently looks best. Too much exploitation too early locks in mistakes.'],
    ['Value function', ['value functions?', 'state values?'], 'v(s): how much return the agent can expect starting from state s and following its policy. It measures how good it is to be somewhere, taking the whole future into account.'],
    ['Action value', ['action values?', 'Q-values?'], 'q(s, a): the expected return of taking action a in state s and then following the policy. If you know the action values you can act well by simply picking the largest one.'],
    ['Q-table', ['Q-tables?'], 'A table with one number per state–action pair, holding the current estimate of q(s, a). Tabular methods such as Monte Carlo control, SARSA and Q-learning learn by updating its entries.'],
    ['Markov property', ['Markov property', 'Markov'], 'The future depends only on the current state, not on how the agent got there. If the state captures everything relevant, the agent can forget the past.'],
    ['Markov decision process', ['MDPs?', 'Markov decision process(?:es)?'], 'The formal model of an RL problem: states, actions, transition probabilities p(s′, r | s, a), rewards and a discount factor. Every problem on this site is an MDP.'],
    ['World model', ['world models?'], 'Knowledge of how the environment works: which state and reward follow each action. With a model the agent can plan (e.g. value iteration); without one it must learn from trial and error.'],
    ['Model-free', ['model-free'], 'Learning values or a policy directly from experience, without ever learning how the environment works. Monte Carlo, SARSA, Q-learning and actor–critic are all model-free.'],
    ['Monte Carlo', ['Monte Carlo'], 'Learning from complete episodes: play until the end, compute the actual return from each step, and move the estimates towards those returns. Simple and unbiased, but it must wait for the episode to finish and is noisy.'],
    ['Temporal difference (TD)', ['temporal[- ]difference', 'TD learning', '\\bTD\\b(?![ -]error| target)'], 'Learning from each step: compare the current estimate with the reward plus the estimate of the next state, and correct the difference immediately. It does not have to wait for the end of the episode.'],
    ['TD error', ['TD errors?'], 'δ = R + γV(S′) − V(S): the surprise in one step. Positive means things went better than expected, negative worse. It drives every TD method and closely matches the firing of dopamine neurons.'],
    ['TD target', ['TD targets?'], 'R + γV(S′): the one-step estimate of the return that TD moves its old value towards.'],
    ['Bootstrapping', ['bootstrap(?:ping)?'], 'Updating an estimate using other estimates, e.g. using V(S′) inside the target. TD methods bootstrap; Monte Carlo does not.'],
    ['SARSA', ['SARSA(?! target)'], 'An on-policy TD method. It learns from the tuple (S, A, R, S′, A′): the target uses the action A′ that the agent will really take next, exploration included, so it learns the value of how it actually behaves.'],
    ['Expected SARSA', ['Expected SARSA'], 'Like SARSA, but the target averages over all next actions weighted by the policy’s probabilities instead of using the single sampled one. This removes noise from the update.'],
    ['Q-learning', ['Q-learning'], 'An off-policy TD method (Watkins, 1989). Its target uses the best next action, max Q(S′, a′), whatever the agent actually does, so it learns the optimal policy while still exploring.'],
    ['On-policy', ['on-policy'], 'Learning the value of the policy the agent is actually following, exploration included. On-policy methods learn behaviour that is safe given that the agent sometimes acts randomly.'],
    ['Off-policy', ['off-policy'], 'Learning about a different policy (usually the greedy, optimal one) than the one generating the experience. Q-learning is off-policy.'],
    ['Generalised policy iteration', ['generali[sz]ed policy iteration'], 'The interplay of two processes: evaluation makes the values match the policy, improvement makes the policy greedy with respect to the values. Repeating both converges to the optimal policy and values.'],
    ['Bellman equation', ['Bellman(?:’s|\'s)?(?: optimality)?(?: equation| principle)?'], 'A recursive relation: the value of a state equals the expected immediate reward plus the discounted value of the next state. The optimality version uses the best action and is the basis of value iteration and Q-learning.'],
    ['Value iteration', ['value iteration'], 'A planning method that needs a world model: apply the Bellman optimality equation to every state again and again until the values stop changing. The greedy policy on the result is optimal.'],
    ['Eligibility trace', ['eligibility traces?', 'traces?'], 'A short-term memory of which states (or boxes) were visited recently. When a TD error arrives, every state is updated in proportion to its trace, so credit flows back along the recent path in one step.'],
    ['Credit assignment', ['credit assignment'], 'Working out which of many earlier actions deserve the credit or blame for a reward that arrives later. It is the central difficulty of RL with delayed rewards.'],
    ['Sample efficiency', ['sample[- ]efficien(?:cy|t)'], 'How much experience a method needs to learn a good policy. TD methods are usually more sample-efficient than Monte Carlo because they learn from every step.'],
    ['Reward hacking', ['reward hacking'], 'The agent finds a way to collect reward that the designer did not intend, such as circling a bonus forever instead of finishing. It optimises exactly what you wrote, not what you meant.'],
    ['Policy gradient', ['policy gradients?'], 'Methods that learn the policy’s parameters directly by gradient ascent on the expected return: make actions that turned out well more likely and actions that turned out badly less likely.'],
    ['REINFORCE', ['REINFORCE'], 'The basic Monte Carlo policy-gradient method (Williams, 1992): after an episode, push up the log-probability of each action taken in proportion to the return that followed it.'],
    ['Baseline', ['baselines?'], 'A reference value subtracted from the return in policy-gradient updates, usually the average or V(s). It does not change the direction on average but greatly reduces noise: only better-than-usual outcomes push an action up.'],
    ['Actor', ['actors?'], 'In actor–critic methods, the part that holds the policy and chooses actions. It improves using the critic’s feedback.'],
    ['Critic', ['critics?'], 'In actor–critic methods, the part that learns a value function and judges each step with the TD error. It does not act.'],
    ['Actor–critic', ['actor[–-]critics?'], 'A method with two learners: the actor (the policy) and the critic (a value function). The critic’s TD error tells the actor, on every step, whether its last action was better or worse than expected.'],
    ['Softmax', ['softmax'], 'A function that turns a list of preferences into probabilities: exponentiate each and divide by the sum. Higher preference, higher probability, but nothing is ever exactly zero.'],
    ['Advantage', ['advantages?'], 'How much better an action is than the average in that state: q(s, a) − v(s). Weighting policy updates by the advantage tells the actor what to do more and less often.'],
    ['Trajectory', ['trajector(?:y|ies)'], 'The sequence S₀, A₀, R₁, S₁, A₁, R₂, … produced by one episode.'],
    ['Optimal policy', ['optimal polic(?:y|ies)'], 'A policy whose expected return is at least as high as any other policy’s from every state. Acting greedily on the optimal action values q* gives one.'],
    ['Deterministic policy', ['deterministic polic(?:y|ies)', 'deterministic'], 'A policy that always picks the same action in a given state, with no randomness. Greedy policies are deterministic.'],
    ['Learning rate', ['learning rates?', 'step size'], 'α: the fraction of the error corrected in each update. Too small and learning crawls; too large and estimates jump around and may not settle.'],
    ['Inverted pendulum (cart-pole)', ['inverted pendulum', 'cart-pole'], 'A pole hinged on a cart that must be kept upright by pushing the cart left or right. A classic control benchmark: the only feedback is a failure signal when the pole falls, often long after the push that caused it.'],
    ['Boxes', ['boxes'], 'The cart-pole state is four continuous numbers. Cutting each into a few ranges gives 3 × 3 × 6 × 3 = 162 boxes, so each state falls into exactly one box and table-based learning works.'],
    ['ASE', ['ASE'], 'Associative Search Element: the actor in Barto, Sutton & Anderson’s 1983 cart-pole learner. It keeps a weight per box and pushes left or right from it, with some noise for exploration.'],
    ['ACE', ['ACE'], 'Adaptive Critic Element: the critic in the 1983 cart-pole learner. It learns a failure prediction per box and turns the rare failure signal into a TD error on every step.'],
    ['Dopamine', ['dopamine'], 'A neurotransmitter. Dopamine neurons fire more than usual for unexpected reward, as usual for predicted reward, and less when a predicted reward is missing: the same pattern as the TD error.'],
    ['Behavioural cloning', ['behaviou?ral cloning', 'cloning', 'clone'], 'Imitation by supervised learning: record an expert’s state–action pairs and train the policy to copy them. It fails in states the expert never visited, because there is no example to copy.'],
    ['DAgger', ['DAgger'], 'Dataset Aggregation: run the cloned policy, ask the expert what it would have done in the states the clone actually reached, add those labels and retrain. It fixes cloning’s blind spots.'],
    ['Demonstrations', ['demonstrations?'], 'Example runs by an expert (a person or a good controller). They give the learner a good starting policy instead of a random one.'],
    ['Planning', ['planning'], 'Using a world model to work out good actions without trying them for real, for example with value iteration or by simulating futures.'],
    ['Terminal state', ['terminal(?: states?)?'], 'A state that ends the episode, such as the goal square or a fallen pole. Its value is 0 because nothing follows.'],
  ];
  const KWRE = (() => {
    const parts = []; KW.forEach((k, i) => k[1].forEach((a) => parts.push({ re: a, i })));
    parts.sort((a, b) => b.re.length - a.re.length);
    return { re: new RegExp('(?<![\\w\\-])(' + parts.map((p) => p.re).join('|') + ')(?![\\w\\-])', 'gi'), parts: parts.map((p) => ({ i: p.i, re: new RegExp('^(?:' + p.re + ')$', 'i') })) };
  })();
  const which = (m) => { for (const p of KWRE.parts) if (p.re.test(m)) return p.i; return -1; };

  function markKeywords() {
    const main = document.querySelector('main'); if (!main) return;
    const SKIP = '.nb-notes,.code-lines,.nb-code,h1,h2,h3,h4,button,label,a,code,pre,select,option,.katex,.quiz,.stats,.calc,.ctl,.seg,.status,.kw,.grid-legend,.legend,.toc,nav,svg,canvas,.plot,.lab-head,table.qt,.stream,.eyebrow,.pill';
    const blocks = main.querySelectorAll('p, li, td, .hint, .takeaway, figcaption, .note, .callout, blockquote, dd, .card p');
    const seen = new Map(); // section id -> Set of keyword indices already marked
    blocks.forEach((b) => {
      if (b.closest(SKIP) || b.dataset.kw) return; b.dataset.kw = '1';
      const sec = b.closest('section'); const sid = sec ? sec.id || 'x' : 'x'; if (!seen.has(sid)) seen.set(sid, new Set());
      const done = seen.get(sid);
      const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => {
        const t = n.nodeValue; KWRE.re.lastIndex = 0; let m, last = 0, frag = null;
        const strong = !!n.parentElement.closest('strong,b,em,dfn');
        while ((m = KWRE.re.exec(t))) {
          const i = which(m[1]); if (i < 0) continue;
          if (done.has(i) && !strong) continue; done.add(i);
          frag = frag || document.createDocumentFragment();
          frag.appendChild(document.createTextNode(t.slice(last, m.index)));
          const sp = document.createElement('span'); sp.className = 'kw'; sp.dataset.k = i; sp.tabIndex = 0; sp.textContent = m[1]; frag.appendChild(sp); last = m.index + m[1].length;
        }
        if (frag) { frag.appendChild(document.createTextNode(t.slice(last))); n.parentNode.replaceChild(frag, n); }
      });
    });
  }

  /* ------------------------------------------------------------------ the box */
  let box, cur = null, hideT = null;
  const tex = (s) => { try { return window.katex ? katex.renderToString(s, { throwOnError: false }) : s; } catch (e) { return s; } };
  function show(target, html, wide) {
    clearTimeout(hideT); if (!box) { box = document.createElement('div'); box.className = 'tipbox'; box.setAttribute('role', 'tooltip'); document.body.appendChild(box); box.addEventListener('mouseenter', () => clearTimeout(hideT)); box.addEventListener('mouseleave', hide); }
    if (cur === target && box.classList.contains('on')) return;
    if (cur) cur.classList.remove('tip-on'); cur = target; target.classList.add('tip-on');
    box.innerHTML = html; box.classList.toggle('wide', !!wide); box.classList.add('on');
    const r = target.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight, vw = document.documentElement.clientWidth;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), vw - bw - 8), y = r.bottom + 10;
    if (y + bh > window.innerHeight - 8) y = r.top - bh - 10 > 8 ? r.top - bh - 10 : Math.max(8, window.innerHeight - bh - 8);
    box.style.left = x + 'px'; box.style.top = y + 'px';
  }
  function hide() { hideT = setTimeout(() => { if (box) box.classList.remove('on'); if (cur) cur.classList.remove('tip-on'); cur = null; }, 120); }
  function formulaOf(el) {
    const ann = el.querySelector('annotation'); const src = ann ? ann.textContent : '';
    for (const f of FORM) if (src.includes(UL.texTips(f[0])) || src.includes(f[0])) return f;
    return null;
  }
  function overrides(el) { const ann = el && el.querySelector('annotation'); const src = ann ? ann.textContent : ''; for (const k in OVR) if (src.includes(UL.texTips(k)) || src.includes(k)) return OVR[k]; return {}; }
  function partHTML(id, ov) { const s = SYM[id]; if (!s) return ''; return `<div class="tip-h">${tex(s[0])}</div><p>${(ov && ov[id]) || s[1]}</p>`; }
  function formulaHTML(el) {
    const f = formulaOf(el), ov = overrides(el), ids = [];
    el.querySelectorAll('[data-tip]').forEach((p) => { if (!ids.includes(p.dataset.tip)) ids.push(p.dataset.tip); });
    const ann = el.querySelector('annotation'), src = ann ? ann.textContent : '', at = (id) => { const i = src.indexOf('tip=' + id + '}'); return i < 0 ? 1e9 : i; };
    ids.sort((a, b) => at(a) - at(b));
    const rows = ids.filter((id) => SYM[id]).map((id) => `<li><span class="tip-sym">${tex(SYM[id][0])}</span><span>${ov[id] || SYM[id][1]}</span></li>`).join('');
    return `<div class="tip-k">Formula</div>${f ? `<div class="tip-h">${f[1]}</div><p>${f[2]}</p>` : ''}${rows ? `<div class="tip-k">Part by part</div><ul class="tip-parts">${rows}</ul>` : ''}<div class="tip-foot">Hover a single symbol to see only that part.</div>`;
  }
  function onOver(e) {
    const part = e.target.closest && e.target.closest('[data-tip]');
    if (part && SYM[part.dataset.tip]) { const disp = part.closest('.katex-display, .katex'); show(part, `<div class="tip-k">Part of the formula</div>${partHTML(part.dataset.tip, overrides(disp))}`); return; }
    const disp = e.target.closest && e.target.closest('.katex-display');
    if (disp && disp.querySelector('[data-tip]')) { show(disp, formulaHTML(disp), true); return; }
    const kw = e.target.closest && e.target.closest('.kw');
    if (kw) { const k = KW[+kw.dataset.k]; show(kw, `<div class="tip-k">Key term</div><div class="tip-h">${k[0]}</div><p>${k[2]}</p>`); }
  }
  function onOut(e) {
    const t = e.target.closest && e.target.closest('[data-tip], .katex-display, .kw'); if (!t) return;
    const to = e.relatedTarget; if (to && (t.contains(to) || (box && box.contains(to)))) return;
    if (to && to.closest && to.closest('[data-tip], .katex-display, .kw')) return;
    hide();
  }
  let wired = false;
  UL.tips = function () {
    markKeywords();
    if (wired) return; wired = true;
    document.addEventListener('mouseover', onOver); document.addEventListener('mouseout', onOut);
    document.addEventListener('focusin', onOver); document.addEventListener('focusout', () => hide());
    document.addEventListener('click', (e) => { // touch: tap to open, tap elsewhere to close
      if (e.target.closest && (e.target.closest('.kw, [data-tip], .katex-display'))) onOver(e); else if (!(box && box.contains(e.target))) hide();
    });
    window.addEventListener('scroll', () => { if (box && box.classList.contains('on')) { box.classList.remove('on'); if (cur) cur.classList.remove('tip-on'); cur = null; } }, { passive: true });
  };
})();
