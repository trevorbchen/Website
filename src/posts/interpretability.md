---
title: Looking inside a model
date: 2026-10
kind: research
tags: interpretability, sparse autoencoders, logit lens
blurb: The logit lens, attention, head ablation on real GPT-2, and a sparse autoencoder that trains in the browser.
featured: yes
js: sae_core.js interp.js
---

I want to know what a model has represented and why it fails when it does. These are the tools I use for that. The first three run on real GPT-2 small activations computed with PyTorch. The last two train and edit a small model in the browser.

## The logit lens

A transformer builds its answer by adding to a running vector, the residual stream, one layer at a time. The logit lens decodes the stream at any layer with the model's final output matrix, as if the network had stopped there.

<div class="demo light" data-demo="lens"></div>

In early layers the guess mostly echoes the current word. The answer usually shows up in the later layers and then sharpens. The lens is crude, because later layers don't promise to read the stream the way the last one does, and the tuned lens exists to correct for that. It is still the quickest way to see where a prediction forms.

## Attention

GPT-2 small has 144 attention heads, and each one chooses which earlier tokens to read from.

<div class="demo light" data-demo="attn"></div>

Head 5.5 on the repeated-names prompt is an induction head. The current token is "Carol", which appeared earlier followed by "Dave", and the head puts 98% of its attention on "Dave". The model then predicts "Dave" with 71% probability.

## Ablation

Head 9.6 on the indirect-object prompt puts 49% of its attention on "Mary", the correct answer. Zeroing it changes the gap between "Mary" and "John" by 0.02.

<div class="demo light" data-demo="ablate"></div>

Across all 144 heads, zeroing a single one flips the answer on the indirect-object prompt in 2 cases and never on the other two prompts. The heads that matter most individually are early ones (0.10, 2.5, 1.3), probably because everything downstream reads from them. Zeroing measures how much the network depends on a component, and says little about what the component does.

Removing the top few heads together does change the answer: after 5 on the indirect-object prompt, 2 on the induction prompt and 8 on the capital-city prompt. The computation is redundant and spread out, so a single head is the wrong unit. Finer tools such as mean ablation, resample ablation and activation patching exist for this reason.

## Sparse autoencoders

If heads and neurons aren't the natural units, one candidate comes from superposition: a network packs more features than it has dimensions by letting them share directions, which works while only a few are active at once. A sparse autoencoder (SAE) learns a dictionary of directions so that each activation is rebuilt from a few of them, and each direction ideally corresponds to a feature you can name.

Below is a toy version. The data is 8 by 8 images, each a mix of one to three hidden features (bars, diagonals, a blob, a border). The SAE never sees which were used.

<div class="demo light" data-demo="sae"></div>

The percentage under each true feature is how well the dictionary recovered it. At dictionary size 10, average recovery ranged from 87% to 99% across seeds in my runs. That seed dependence is what the [SAE paper](sae-families.html) is about.

A dictionary can also be used to edit. Find which features are active in an image, scale one up or down, and decode. In the paper we do this on face images to change things like glasses thickness, hair colour and background tint.

## Choosing the dictionary

A standard SAE loss asks for good reconstruction with few units. When two dictionaries reconstruct equally well, the seed decides between them. The paper adds a term that prefers a geometry. The smallest case that can be solved exactly has two directions in the data and a dictionary with room for one.

<div class="demo light" data-demo="tilt"></div>

Under plain MSE the dictionary keeps whichever direction is more frequent. Reweighting the loss makes it keep the other one.

The same thing happens when you train the toy SAE. Set the dictionary size to 5 and k to 2 so it has to leave features out, then press compare objectives. Averaged over six seeds, plain MSE recovers the diagonals at 61 to 72%, the blob at 79% and the border at 63%. The edge-tilted loss recovers both diagonals at 98% and gives up the blob and border (about 49% each). Average recovery over all eight features drops from 73% to 67%, so the tilt chooses which features to keep and does not find more of them. When the dictionary has room for everything, the tilt changes little and costs some reconstruction.

On trained SAEs for face images, the same lever works without hurting reconstruction. The toy here shows the mechanism at a size where you can watch it.

## Next

I want an SAE to say where and why a model breaks as well as what it represents; the hard-image result in the paper is a small first step. I'm interested in what SAEs can say about diffusion models. And I want better answers to the correlation-versus-cause problem that the ablation section runs into: a feature that lights up when something happens doesn't yet cause it.

All the GPT-2 numbers on this page come from six short prompts, and the SAE is a toy. They illustrate the tools and are not findings. The [explorer](../explorer.html) lets you browse attention and the logit lens on all six prompts.
