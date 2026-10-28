---
title: Better molecules, fewer experiments
date: 2026-07
kind: research
tags: AI for science, diffusion, reinforcement learning, NeurIPS 2026
blurb: Steering a molecule generator with a few thousand expensive measurements. NeurIPS 2026, with Genesis Molecular AI and ETH Zurich.
featured: yes
math: yes
---

A pretrained molecule generator knows what drug-like molecules look like. Almost everything it proposes is plausible and almost none of it binds the protein you care about. To fix that you need a score for each molecule, and the scores that matter are expensive. This paper asks what to do when you can afford a few thousand of them.

## Setup

Let $p_{\text{pre}}(x)$ be the generator and $r(x)$ the score. The target is the prior reweighted by the reward,

$$p^\ast(x) \propto p_{\text{pre}}(x)\, e^{r(x)/\beta},$$

which keeps molecules that look like chemistry and pushes mass toward the ones that score well. Everything in the paper is a way to approximate $p^\ast$ with a small number of reward evaluations.

![Reweighting a prior by a reward](../img/ddamo/tilting.png)

## Cost decides the method

When a score is cheap you can sample a million candidates and keep the best. Code and math work this way, since a compiler or proof checker is exact and fast. Binding affinity is not like that: a learned model takes milliseconds, a structure-prediction run takes minutes, a wet-lab assay takes weeks. Once measurements are the bottleneck, more sampling doesn't help, and the question becomes which candidates get measured and what each measurement teaches.

![Best-of-N wins when calls are cheap; adaptation wins when they are not](../img/ddamo/regimes.png)

There are two places to put the feedback. You can use it to select among samples from a frozen generator, or you can use it to update the generator. We update the generator, because a selection is used once and a gradient step carries into every later round.

## The loop

Each round samples from the generator, scores candidates with a surrogate ensemble, spends a few oracle calls, and fine-tunes. Four choices matter.

- **Which candidates to measure.** We use Thompson sampling over an ensemble of ten small networks: draw one sample from each candidate's predictive spread and send the top few to the oracle. A surrogate trained on a few thousand points is overconfident near what it has seen, and this keeps sending queries elsewhere.
- **What to learn from.** CVaR shaping. Only samples above the running 80th-percentile reward contribute, since you ship the best molecule and the average one doesn't matter.
- **How far to move.** Density entropy regularization (DER) subtracts the generator's own log-likelihood from the log-reward, $\log r(x) - \gamma \log p_\theta(x)$. Molecules the model already samples often are discounted, so the dominant mode stops absorbing all the gradient.
- **What keeps it stable.** A replay buffer and a validity penalty. Without the penalty, validity collapses within the first hour.

![Density entropy regularization discounts the dominant mode](../img/ddamo/diagram_der.png)

## Results

Nine tasks, five seeds each: six small-molecule binding targets and three protein-fitness tasks (GB1, CreiLOV, TrpB).

Against five inference-time search baselines on a frozen generator (best-of-N, beam search, MCTS, discrete Feynman-Kac correctors, SMC), the full loop reaches the best baseline's final score in about 58 times fewer oracle calls on the molecules and about 16 times fewer on the proteins.

![Best reward so far against oracle calls](../img/ddamo/vs_search.png)

Removing any one component lowers reward. Density entropy regularization is the largest under the DDPP-LB objective: at 5,000 calls the full loop reaches about 0.97 normalized reward, and about 0.58 without it.

The more interesting result is in the interactions. With DER, CVaR and Thompson sampling all off, the mean best score is −1.06. CVaR alone gives −0.86 and Thompson alone gives −0.80. DER alone gives −0.43, and from there adding the other two reaches +1.13. DER makes room away from the prior, and the other two only help once that room exists. A leave-one-out table makes them look marginal.

![Removing components in combination, on one target](../img/ddamo/additivity_curves.png)

On the protein tasks the ablations are nearly flat. The generators there are trained per family, so good variants are already in distribution and there is no off-prior headroom to open. If the molecules you want are close to what the prior already produces, sampling and selecting is enough.

## Limits

The 58x figure is about budget, not ceiling; with enough calls the search baselines get there too. The oracle is a learned affinity model, so this is not evidence of 58x better molecules, and none of them were tested in a lab. We did not tune the baselines. The ranking of components also depends on the fine-tuning objective: under VIDD, Thompson sampling matters more than DER.

I shared first authorship with Ariel Dai. The other authors are Jason Yang, Riccardo De Santi, Daniel Khalil, Wenda Chu, Nate Gruver, Pranav Murugan, Alexander Goldberg, Maruan Al-Shedivat and Yisong Yue, across Caltech, ETH Zurich and Genesis Molecular AI. The paper is on [arXiv](https://arxiv.org/abs/2607.02834), the code on [GitHub](https://github.com/trevorbchen/DDAMO), and the results on [Hugging Face](https://huggingface.co/trevorbchen/DDAMO).
