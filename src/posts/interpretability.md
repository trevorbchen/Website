---
title: Looking inside a model
date: 2026-10
kind: research
tags: interpretability, sparse autoencoders, logit lens
blurb: The interpretability tools I keep returning to, each one live on this page: the logit lens, attention, ablating heads on real GPT-2, and a sparse autoencoder that trains in your browser.
featured: yes
js: sae_core.js interp.js
---

A trained network is a program that nobody wrote. Interpretability is the attempt to read it anyway. I come at this from two sides: I want to know what a model has represented, and I want to know why it fails when it does. These are the tools I keep returning to, and each one is running on this page. The first three use real activations from GPT-2 small, computed with PyTorch. The last two train and edit a small model in your browser.

## 1. The logit lens

A transformer builds its answer by adding to a running vector, the residual stream, one layer at a time. The **logit lens** takes the stream at any layer and decodes it with the model's final output matrix, as if the network had stopped there. You get the model's best guess so far.

<div class="demo light" data-demo="lens"></div>

At the bottom of the network the guess is mostly an echo of the current word. The answer tends to appear in the later layers and then sharpen. The lens is crude, since later layers don't promise to read the stream the way the final one does, and refinements such as the tuned lens exist for that reason. It's still the fastest way to watch a model make up its mind.

## 2. Attention: where a head reads from

Each of the model's 144 attention heads decides, for every token, which earlier tokens to read from. That makes attention the easiest thing in a transformer to look at, and the easiest to over-read.

<div class="demo light" data-demo="attn"></div>

Head 5.5 on the repeated-names prompt is a clean example of an **induction head**. The current token is "Carol". The last time "Carol" appeared, it was followed by "Dave", and head 5.5 puts 98% of its attention on "Dave". The model then predicts "Dave" with 71% confidence. A short rule, "find the last time I saw this token and copy what came next", appears to be implemented by a single head.

## 3. Looking is not the same as doing

Head 9.6 on the indirect-object prompt looks like it is doing exactly the right thing: reading from "Mary", the correct answer, with 49% of its attention. So take it out.

<div class="demo light" data-demo="ablate"></div>

Zeroing head 9.6 changes the gap between "Mary" and "John" by 0.02. The model barely notices. Across all 144 heads, removing any single one flips the answer on the indirect-object prompt in only 2 cases, and never on the other two prompts. The heads that matter most individually are mostly in the first few layers (0.10, 2.5, 1.3), which isn't surprising once you see why: they feed everything downstream, so zeroing them corrupts whatever the later layers expected to read. That is the weakness of zeroing a head. It measures how much the network depends on a component, not what the component does.

The second panel shows the other side. Remove the top few heads together and the answer does change: after 5 on the indirect-object prompt, after 2 on the induction prompt, after 8 on the capital-city prompt. Computation here is **redundant and distributed**. No one head is the answer, and more than one head can do the same job. This is why the field moved to finer tools than knocking out a head: mean and resample ablation, activation patching, path patching. It's also the best argument I know for the next idea, because the head is the wrong unit.

## 4. Sparse autoencoders

If heads and neurons aren't the natural units, what is? One answer comes from **superposition**: a network represents more features than it has dimensions by letting them share directions, which works as long as only a few are active at once. A **sparse autoencoder** (SAE) tries to undo that. It learns a dictionary of directions such that every activation is rebuilt from a few of them, and the hope is that each direction is a feature you can name.

Here is a tiny version you can run. The data is 8 by 8 images, each one a mix of one to three hidden features: bars, diagonals, a blob, a border. The SAE never sees which features were used. It trains live as you watch.

<div class="demo light" data-demo="sae"></div>

The percentage under each true feature is how well the dictionary recovered it. At a dictionary size of 10, my runs gave average recovery anywhere from 87% to 99% depending only on the random seed, and "new seed" lets you see that for yourself. That's the problem behind my [SAE paper](sae-families.html): the dictionary you get is partly an accident of initialization, even though nothing about the data changed.

### Steering

Once you have a dictionary you can use it as a control panel. Take an image, find which features are active, and scale one of them up or down before decoding. The edit shows only what that direction contributes. In the paper we do this with real face images, turning individual features to change glasses thickness, hair colour or background tint.

## 5. Choosing the dictionary

Every standard SAE loss says the same thing: reconstruct well using few units. When two dictionaries reconstruct equally well, nothing in the loss prefers one, which is how a seed ends up deciding. The idea in the paper is to add a term that prefers some geometry, so the loss itself says what kind of feature you want. The cleanest way to see why that works is a model small enough to solve exactly. Take two directions in the data and a dictionary with room for only one.

<div class="demo light" data-demo="tilt"></div>

Under plain MSE, the dictionary keeps whichever direction shows up more often. Reweight the loss and it keeps the other. And the same effect appears when you train an SAE. Back in the toy above, set the dictionary size to 5 with k = 2, so that it has to leave features out, and press **compare objectives**. Averaged over six seeds, plain MSE recovers the diagonals at 61 to 72% and the blob and border at 79% and 63%. The edge-tilted loss recovers both diagonals at 98% and gives up the blob and the border (about 49% each). Average recovery across all eight features drops a little, from 73% to 67%: it has chosen which features to keep, not found more of them. When the dictionary has room for everything, the tilt changes little and just costs reconstruction. It only matters when the dictionary has to choose, which is the regime the theorem is about.

In the paper the same lever works on trained SAEs for real images, without costing reconstruction. The toy here is not that result. It's the same mechanism at a scale where you can watch it.

## What I want to understand next

Three things I'm after. First, failure modes: I'd like an SAE to tell me not just what a model represents but where and why it breaks, and the paper's hard-image result is a first small step. Second, diffusion models, where I've been training SAEs on a diffusion transformer to see how features steer generation across denoising steps. Third, the gap between correlation and cause, which section 3 should make feel uncomfortable: a feature that lights up when something happens is not yet a feature that makes it happen.

All of the GPT-2 numbers on this page come from six short prompts, and the SAE is a toy. They show the tools, not a finding. If you want to explore attention and the logit lens on all six prompts at once, there's a [fuller explorer](../explorer.html).
