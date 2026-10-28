---
title: Specs are the hard part
date: 2026-10
kind: project
tags: formal verification, AI agents, SMT solvers
blurb: Most of formal verification isn't proving things. It's deciding what to prove, and a loop between a model that drafts specs and a verifier that refutes them. A small demo you can break.
js: verify.js
---

When we pitched Ascade, the pitch was that you can prove software correct. When we built it, almost none of the work was proving. A verifier is a perfectly honest judge of exactly the question you asked it, and the whole difficulty lives in asking the right one.

## The part nobody warns you about

An SMT solver like Z3 will tell you, quickly and without flattery, whether a program satisfies a specification. If it does, you get a proof. What it cannot tell you is whether the specification says anything useful. "The output is sorted" is satisfied by a function that returns an empty list. A spec can be true, checked, and worthless.

The first thing we built, in the fall of 2025, was a pipeline that turned English requirements into formal postconditions: "sort a list of integers" in, a statement about every pair of adjacent elements out, with a language model drafting and Z3 as the arbiter. The drafts were plausible. They were also incomplete in ways that only showed up when something refuted them.

Everything we shipped after that, a payment processor whose specs were checked against the invariants of the production system, and access control for AI agents with verified guarantees, was built on the same loop:

1. **A model proposes a specification.**
2. **A verifier tries to break it** and returns a counterexample.
3. **The counterexample goes back to the model**, which either fixes the spec or fixes the code.

## Try the loop

Below is a miniature version. The checker enumerates every input in a small domain, so it isn't a proof, and the "agent" steps are scripted rather than a live model. The verifier is real, though, and both boxes are editable. Pick a function, press play, then break something.

<div class="demo" data-demo="verify"></div>

Two things are worth noticing as it runs. First, the counterexample is the most informative object in the loop: it told us the first draft of `clamp` quietly assumed `lo <= hi`, which nobody had written down. Second, the *mutation check* at the bottom is what catches the quieter failure. A spec that the correct code satisfies has passed only half the test. It also has to reject wrong programs. If a function that clamps to the wrong end, or returns an empty list, still satisfies your spec, then your spec is too weak, however green the checkmark is.

## Why I like this for AI agents

Verification is one of the rare places where the oracle is both cheap and exact. In my molecule work, one measurement can take weeks and tells you something noisy. A verifier answers in milliseconds and doesn't lie. That asymmetry is why reinforcement learning from verifiable rewards works so well on code and math, and it's why I think specs are going to matter more as agents write more of the code. A model that can write a program but can't say what the program is supposed to do has simply moved the bug.

Training the drafter against the verifier is the natural next step, because the reward is cheap and exact. It's the world the small model we built for formal-verification benchmarks lives in, and it's why a small model can compete there with much larger ones.

## What this demo isn't

Real verification handles unbounded inputs, loops that need invariants, quantifiers, and arithmetic that doesn't fit in a bounded domain. It also can't tell you whether your requirement was the right requirement in the first place. This is the part of the loop that is still a human's job, and the reason I stopped thinking of verification as a proving problem and started thinking of it as a conversation.
