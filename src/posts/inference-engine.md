---
title: Building a tiny vLLM
date: 2026-10
kind: project
tags: inference, GPU, systems
blurb: A small LLM serving engine with the canonical pieces: a paged KV cache, continuous batching, preemption, and fused Triton kernels. Checked token for token against Hugging Face, with real recorded runs you can replay on this page.
js: replay.js
---

Serving a language model is mostly a memory and scheduling problem. The arithmetic for one token is small. What makes a server fast or slow is how many requests it can keep in flight at once, and that is limited by something unglamorous: the **KV cache**.

I wanted to understand that properly, so I built the core of a modern serving engine from scratch and measured it against Hugging Face on the same requests. This page is a tour of it. Nothing here runs a model in your browser or on a server of mine. The numbers come from runs I recorded on real hardware, saved as data files, and **replayed** below.

## The cache is the whole game

When a transformer generates token number *n*, it needs the keys and values of all *n&minus;1* earlier tokens at every layer. Recomputing them each step would be absurdly wasteful, so they are kept: that's the KV cache. It grows by one entry per token per layer, and it is held for as long as the request is alive.

For the 1.1B-parameter model I used (TinyLlama, 22 layers, 4 key-value heads of size 64, in half precision), each token costs 2 &times; 22 &times; 4 &times; 64 &times; 2 bytes = **22,528 bytes**. A 2,048-token request holds about 46 MB. A GPU that holds the weights and has a few gigabytes left over can only keep so many of those alive, and that number is what sets throughput.

### Paged blocks

The obvious implementation gives each request one contiguous slab of cache sized for the longest sequence it might ever reach. Most requests never get anywhere near that length, so most of the slab sits empty, and empty cache means fewer requests in the batch. The vLLM paper measured that earlier systems used only about 20 to 38 percent of their cache memory for real token state.

The fix is the one operating systems use for memory: **paging**. Cut the cache into fixed blocks of 16 tokens, hand them out on demand, and keep a per-request *block table* that maps a sequence's logical blocks to wherever they landed physically. The only waste is the unused tail of each request's last block.

<div class="demo light" data-demo="paging"></div>

Switch the policy and watch how many requests fit. In paged mode the pool fills with tokens; in the reserve-the-maximum mode, most of it is stranded and the queue backs up.

## Continuous batching

The second idea is about *when* requests join the batch. The simple approach, **static batching**, collects a batch, runs it until the slowest sequence finishes, and only then takes the next batch. Every sequence that finished early sits there generating padding, and everything waiting behind it waits for the stragglers too.

**Continuous batching** (Orca called it iteration-level scheduling) makes the decision every step instead. After each forward pass, finished sequences leave and waiting ones take their place. The engine's scheduler is short enough to quote:

1. If a request is waiting and the cache has room for its prompt, run its **prefill** (one pass over the whole prompt) and emit its first token.
2. Otherwise run one **decode** step for every running sequence.
3. If a decode step needs a new block and none are free, **preempt** the most recently admitted sequence: free its blocks and put it back at the front of the queue to be recomputed later.

Here is every request in a recorded run, with the engine and with Hugging Face's `generate` in static batches of 8, 16 and 32. Press play, or click anywhere on the chart to move the playhead.

<div class="demo light" data-demo="timeline"></div>

In the static-batch views, the grey portion of each bar is decode work spent on a sequence that had already finished. That is the straggler tax, and it is why larger batches help so little: a bigger batch has a longer slowest member.

### What the cache is doing

The same run, from the engine's own trace. Each point is one scheduler step.

<div class="demo light" data-demo="cache"></div>

## Results

<div class="demo light" data-demo="results"></div>

Two things are worth being careful about. The workload is synthetic (random prompt tokens, lengths drawn from a skewed distribution, and every request runs for exactly its target length so both systems do the same useful work). And these are single-GPU numbers on a laptop card, which says something about scheduling and memory, not about how the engine behaves at scale.

## How I know it's right

A fast server that returns different tokens is not a faster server. The engine loads weights straight from a Hugging Face model, and every claim is tested against Hugging Face's own `generate` on a small random Llama in full precision, so there's no tolerance to hide behind:

- prefill logits match the reference exactly
- single-request greedy decoding through the paged cache matches token for token, at several prompt lengths
- nine requests of different lengths batched together all match, with no leaked blocks
- under deliberate memory pressure the engine preempts and recomputes eight times, and every output still matches
- generation stops correctly at the end-of-sequence token
- requests arriving over time are never served before they arrive

On the real model in half precision, 6 of 6 sampled requests produced 24-token outputs identical to Hugging Face at batch size one. That is a small sample. With enough requests, near-ties will eventually come out differently, because floating-point sums are added in a different order depending on what else is in the batch.

## The kernels

The attention in the recorded runs is plain PyTorch: gather each sequence's blocks into a padded tensor, mask, and call scaled-dot-product attention. That's the readable reference version, and it leaves a lot of speed on the table. I wrote the fused versions in Triton, each with a test against a float32 reference:

- **add + RMSNorm** in one pass over the residual stream
- **RoPE and the cache write** in one kernel, so keys and values go straight into their physical blocks
- **SwiGLU** from the fused gate/up projection
- **FlashAttention-2** style causal attention for prefill, with grouped-query attention and an online softmax
- **PagedAttention v2** for decode: a block-table gather with an online softmax, split across the context (flash-decoding), handling all the query heads that share one key-value head together, followed by a small reduction kernel

They are written to avoid host synchronization, so a whole decode step could be captured in a CUDA graph. **They have not run yet.** Triton needs a C compiler to build its launcher, and the machine I developed on doesn't have one, so the runs on this page all use the reference attention path, and each run is labelled with which path it used. Once the kernels compile and pass their tests, the fused-kernel runs will show up in the same replay as another dataset, and this paragraph will change.

## Where it ran

Each recorded run is labelled with its GPU, and you can switch between them above. The first is a laptop RTX 4060. The second is one A100 80GB on a shared lab machine, which I used only after checking that nothing else was running on it and that it was idle (0 MiB used, 0% utilization) before and after.

The A100 gap is smaller: 970 tokens/s against 771 for the best static batch, about 1.26&times;, versus 1.44&times; on the laptop. A 1.1B model barely loads an A100, so with the reference attention path both systems spend much of their time on per-step overhead, and the larger static batches recover more of the idle time. The latency picture is the same on both cards: with requests arriving over time, the engine's median latency was 0.7 s against 3.6 to 9.2 s for static batching.

## What it doesn't do yet

Greedy decoding only (no sampling), one GPU, prompts that are fully prefilled in one pass, and no prefix caching, chunked prefill, speculative decoding or tensor parallelism. Those are the natural next steps, and each is a well-known idea I'd like to build rather than just cite.
