---
title: Building a tiny vLLM
date: 2026-10
kind: project
tags: inference, GPU, systems
blurb: A small LLM serving engine with a paged KV cache, continuous batching and preemption, checked token for token against Hugging Face, with recorded runs you can replay here.
js: replay.js
---

Serving a language model is mostly a memory and scheduling problem. The arithmetic for one token is small, and how many requests a server can keep in flight is limited by the KV cache.

I built the core of a modern serving engine from scratch and measured it against Hugging Face on the same requests. Nothing on this page runs a model in your browser or on a server of mine. The numbers come from runs I recorded on real hardware and saved as data files, and the page replays them.

## The KV cache

To generate token *n*, a transformer needs the keys and values of all *n&minus;1* earlier tokens at every layer. They are kept rather than recomputed, which is the KV cache. It grows by one entry per token per layer for as long as the request is alive.

For the 1.1B model I used (TinyLlama: 22 layers, 4 key-value heads of size 64, fp16), each token costs 2 &times; 22 &times; 4 &times; 64 &times; 2 bytes = 22,528 bytes. A 2,048-token request holds about 46 MB, and the number of those that fit in the memory left after the weights sets throughput.

### Paged blocks

The obvious implementation gives each request one contiguous slab sized for the longest sequence it might reach. Most requests never come close, so most of the slab sits empty and fewer requests fit in the batch. The vLLM paper measured earlier systems using about 20 to 38 percent of cache memory for real token state.

The fix is paging, as in an operating system. The cache is cut into blocks of 16 tokens that are handed out on demand, and each request has a block table mapping its logical blocks to physical ones. The only waste is the unused tail of each request's last block.

<div class="demo light" data-demo="paging"></div>

## Continuous batching

Static batching collects a batch, runs it until the slowest sequence finishes, and then takes the next one. Sequences that finish early sit generating padding, and everything queued behind them waits for the slowest.

Continuous batching (Orca called it iteration-level scheduling) decides every step. After each forward pass, finished sequences leave and waiting ones join. The scheduler is short:

1. If a request is waiting and the cache has room for its prompt, run its prefill (one pass over the whole prompt) and emit the first token.
2. Otherwise run one decode step for every running sequence.
3. If a decode step needs a new block and none is free, preempt the most recently admitted sequence: free its blocks and put it back at the front of the queue to be recomputed.

Here is every request in a recorded run, for the engine and for Hugging Face's `generate` in static batches of 8, 16 and 32.

<div class="demo light" data-demo="timeline"></div>

In the static-batch views the grey part of each bar is decode work spent on a sequence that had already finished. A bigger batch has a longer slowest member, so larger batches help less than you would expect.

The same run from the engine's own trace, one point per scheduler step:

<div class="demo light" data-demo="cache"></div>

## Results

<div class="demo light" data-demo="results"></div>

The workload is synthetic: random prompt tokens, lengths from a skewed distribution, and every request runs for exactly its target length so both systems do the same useful work. These are single-GPU numbers, so they say something about scheduling and memory and nothing about behaviour at scale.

The laptop RTX 4060 gives 506 tokens/s for the engine against 351 for the best static batch. One A100 80GB gives 970 against 771, a smaller gap of about 1.26&times; (1.44&times; on the laptop). A 1.1B model barely loads an A100, and with the reference attention path both systems are dominated by per-step overhead, so large static batches recover more of the idle time. With requests arriving over time, the engine's median latency was 0.7 s on the A100 against 3.6 to 9.2 s for static batching, and 1.2 s against 5.0 to 12.5 s on the laptop. I ran on the A100 only after checking that nothing else was using it, and it was idle (0 MiB, 0% utilization) before and after.

## Correctness

The engine loads weights directly from a Hugging Face model. Every claim is tested against Hugging Face's `generate` on a small random Llama in full precision, so there is no tolerance:

- prefill logits match the reference exactly
- single-request greedy decoding through the paged cache matches token for token at several prompt lengths
- nine requests of different lengths batched together all match, with no leaked blocks
- under deliberate memory pressure the engine preempts and recomputes eight times and every output still matches
- generation stops correctly at the end-of-sequence token
- requests arriving over time are never served before they arrive

On the real model in fp16, 6 of 6 sampled requests gave 24-token outputs identical to Hugging Face at batch size one, on both GPUs. That is a small sample. With enough requests, near-ties will eventually differ, because floating-point sums are added in a different order depending on what else is in the batch.

## Kernels

The attention in the recorded runs is plain PyTorch: gather each sequence's blocks into a padded tensor, mask, and call scaled-dot-product attention. That is the readable version and it leaves a lot of speed unused. I wrote fused Triton versions with tests against a float32 reference:

- add + RMSNorm in one pass over the residual stream
- RoPE and the cache write in one kernel, so keys and values go straight into their physical blocks
- SwiGLU from the fused gate/up projection
- FlashAttention-2 style causal attention for prefill, with grouped-query attention and an online softmax
- PagedAttention v2 for decode: a block-table gather with an online softmax, split across the context (flash-decoding), handling all the query heads that share a key-value head together, then a small reduction kernel

They avoid host synchronization, so a decode step could be captured in a CUDA graph. They have not run yet. Triton needs a C compiler to build its launcher, and my development machine doesn't have one, so every run here uses the reference attention path. When they compile and pass their tests, the fused runs will appear as another dataset in the replay.

## Not done

Greedy decoding only, one GPU, prompts prefilled in one pass, and no prefix caching, chunked prefill, speculative decoding or tensor parallelism. Each is a well-known idea I'd like to build instead of cite.
