---
title: A theory of diffusion models that was wrong
date: 2025-10
kind: essay
tags: diffusion, intuition, failed idea
blurb: After reading Yang Song's diffusion work I had a clean theory and tested it with seven small experiments. It was wrong in a useful way.
---

I read Yang Song's writing on score-based models in the fall of 2025 and came away with a one-sentence theory: a diffusion model learns a manifold of Gaussians around the training data.

The picture is this. Add Gaussian noise to a data point repeatedly and you get a fuzzy Gaussian cloud centered on it. Do that for every point and the noised data is a mixture of Gaussians, one per training point. The reverse process is then navigation across that field, guided by the score ∇log p.

## Seven experiments

1. Noise a single 2D point repeatedly and check that the cloud is Gaussian with the right covariance.
2. Run the actual forward process, x_t = √(1−β_t)·x_{t−1} + √β_t·ε, and check that the variance follows (1 − ᾱ_t).
3. Start from a correlated Gaussian and watch the correlation decay. The structure is gone by about step 15 to 25.
4. Run deterministic gradient ascent on a 5-mode mixture. Every point collapses onto a mode center.
5. Add noise (Langevin dynamics) and the points spread through the clouds.
6. Sweep the noise scale. Too little collapses, too much is chaos, and √(2α) is the calibrated choice.
7. Anneal the noise over time. Exploring early and refining late falls out, and that is reverse diffusion.

After that I trained small DDPM, DDIM and score-SDE models, and swapped Gaussian noise for Laplace noise to compare L1 and L2 losses.

## What was wrong

The mixture of Gaussians is a correct description of the noised data. It is exactly the noised distribution of the empirical training set. If a network learned the score of that distribution exactly, reverse diffusion would flow into a training point every time. Trained models don't do that, so the theory described something other than what a model learns. A trained network is a smooth, low-capacity approximation to that score, and generalization lives in the gap. My experiments never touched the gap because the 2D scores I used were exact.

I had asked what the target is, when the useful question is why the network doesn't reach it.

That question led to my [memorization work](memorization.html), which is about which modes a finite network absorbs first and what delays the rest. The seven experiments were small and took a few days. They taught me more than a month of reading, mostly because they showed me precisely where the story stopped being true.
