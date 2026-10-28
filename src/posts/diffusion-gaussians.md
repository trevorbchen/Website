---
title: A theory of diffusion models that turned out to be wrong, and why I'm glad I wrote it down
date: 2025-10
kind: essay
tags: diffusion, intuition, failed idea
blurb: After reading Yang Song's diffusion work I got a clean theory in my head and tested it with seven small experiments. It was wrong in an instructive way.
---

Yang Song's writing on score-based models is some of the best technical writing in machine learning. I read it in the fall of 2025, the way you read a great book: slowly, then in a rush, and then with a notebook open, itching to build something.

## The theory

Here's the picture that formed in my head. Add Gaussian noise to a data point enough times and you get a fuzzy Gaussian cloud centered on it. Do this for every point in the dataset and the noised data is a big mixture of Gaussians, one per training point. So, I figured, **a diffusion model is learning a "manifold of Gaussians" around the training data**, and the reverse process is a navigation problem across that field, guided by the score ∇log p.

That felt like a satisfying one-sentence explanation, so I did what I'd want a student to do: I tested it. I wrote seven small experiments:

1. Repeatedly noise a single 2D point and check the cloud really is Gaussian with the right covariance.
2. Run the actual forward process (x_t = √(1−β_t)·x_{t−1} + √β_t·ε) and watch the cloud expand, and watch variance follow (1 − ᾱ_t).
3. Start from a *correlated* Gaussian and watch the correlation decay. Forward diffusion is a forgetting machine; by roughly step 15 to 25 the structure is gone.
4. Run **deterministic gradient ascent** on a 5-mode mixture and watch every point collapse onto a mode center, with no sampling at all.
5. Add noise (Langevin dynamics) and watch the points spread through the clouds instead.
6. Sweep the noise scale and find a Goldilocks zone: too little and you collapse, too much and you get chaos. √(2α) is the calibrated answer.
7. **Anneal** the noise over time and watch "explore early, refine late" emerge, which is basically reverse diffusion.

After that I trained actual small models (DDPM, DDIM, score-SDE variants) and, because I was curious, tried swapping the Gaussian noise for Laplace noise and comparing L1 against L2 losses.

## How it was wrong

The mixture-of-Gaussians picture is not a *bad* description of the noised data. It's literally the exact noised distribution of the empirical training set. That's the problem. If a network learned the score of *that* distribution exactly, it would memorize: reverse diffusion would just flow into one of the training points, every time.

Real diffusion models don't do that. So the theory wasn't describing the thing worth describing. What a trained network learns is *not* "a Gaussian around each training point." It's a smooth, low-capacity approximation to it, and the gap between those two things is where generalization lives. My toy experiments never touched that gap, because my 2D score functions were exact.

I misunderstood the question. I was asking "what is the target?" when the interesting question is "why doesn't the network hit it?"

## Why I think it was worth doing anyway

That mistake is the groundwork for the research I do now. The question *why don't diffusion models memorize?* became the center of my [memorization work](memorization.html): extra latent dimensions, spectral timescales, which modes a network absorbs first. The path from "diffusion is a field of Gaussians" to "the interesting thing is which of those Gaussians a finite network can resolve, and when" is short.

Two lessons I keep:

- **Build the smallest possible experiment before you trust a clean story.** Seven toy experiments taught me more than a month of reading.
- **A wrong theory that gives you precise questions is better than a vague right one.**

The code is in a folder on my machine named something embarrassing, and I'm keeping it that way.
