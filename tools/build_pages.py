"""
Assemble the interactive lesson pages of the Reinforcement Lab.

Each lesson body lives in tools/pages/<page>.html. This script wraps it with the shared
<head>, header, table of contents (built from the <section id> / <h2> of the body) and footer,
and writes <page>.html at the root of the site.

Usage:  python tools/build_pages.py
Author: Eng. Saeed Serwan Abdulsattar
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from site_shell import header_html, FOOTER, head_html, NAME  # noqa: E402

PAGES = [
    ("index.html", "Overview", "Learning by trial and error", "overview.js",
     "An interactive, minimal lab for learning reinforcement learning: agents, Markov decision processes, Monte Carlo, temporal difference, Q-learning, actor–critic and the inverted pendulum."),
    ("maze.html", "The maze & Monte Carlo", "A grid maze and Monte Carlo", "maze.js",
     "Learn reinforcement learning on a small grid maze: world models, sampling, returns, Q-tables, exploration and Monte Carlo control, all interactive."),
    ("td.html", "Temporal difference", "Temporal difference, SARSA and Q-learning", "td.js",
     "Temporal difference learning, the TD error, SARSA, Expected SARSA, Q-learning, the cliff, eligibility traces and value iteration, interactive."),
    ("policy.html", "Policy gradients", "Policy gradients and actor–critic", "policy.js",
     "Policy gradients and actor–critic methods explained with live experiments: baselines, softmax, continuous actions, the advantage and an actor–critic on a maze."),
    ("pendulum.html", "Inverted pendulum", "The inverted pendulum", "pendulum.js",
     "Balance a pole on a cart yourself, then watch Q-learning and the 1983 actor–critic of Barto, Sutton and Anderson learn it from a single failure signal."),
    ("brain.html", "Brain & limits", "Reinforcement learning, the brain and its limits", "brain.js",
     "Dopamine and the TD error, actor and critic in the striatum, and what reinforcement learning still cannot do well: luck, sample inefficiency, world models and demonstrations."),
]


def build(fname, toc_title, title, js, desc):
    body = (ROOT / "tools" / "pages" / fname).read_text(encoding="utf-8")
    secs = re.findall(r'<section id="([^"]+)" class="chapter">\s*<h2><span class="chap">\d+</span>(.*?)</h2>', body, re.S)
    toc = "\n".join(f'      <li><a href="#{i}">{re.sub(r"<[^>]+>", "", t).strip()}</a></li>' for i, t in secs)
    html = f'''<!DOCTYPE html>
<html lang="en">
{head_html(f"{NAME} · {title}", desc)}
<body>

{header_html(fname)}

<div class="layout">
  <aside class="toc" aria-label="Contents">
    <p class="toc-title">{toc_title}</p>
    <ol>
{toc}
    </ol>
  </aside>

  <main>
{body.rstrip()}
  </main>
</div>

{FOOTER}

<script src="assets/vendor/katex/katex.min.js"></script>
<script src="assets/vendor/katex/auto-render.min.js"></script>
<script src="assets/js/lib.js"></script>
<script src="assets/js/tips.js"></script>
<script src="assets/js/{js}"></script>
</body>
</html>
'''
    (ROOT / fname).write_text(html, encoding="utf-8")
    print(f"{fname}: {len(secs)} sections")


if __name__ == "__main__":
    only = sys.argv[1:]
    for p in PAGES:
        if not only or p[0] in only:
            build(*p)
