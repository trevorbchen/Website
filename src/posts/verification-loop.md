---
title: Specs are the hard part
date: 2025-11
kind: project
tags: formal verification, AI agents, SMT solvers
blurb: Most of formal verification is deciding what to prove. A loop between a model that drafts specs and a verifier that refutes them, with a small demo.
js: verify.js
---

When we pitched Ascade, the pitch was that you can prove software correct. When we built it, almost none of the work was proving. A verifier judges exactly the question you ask it, and the difficulty is asking the right one.

## The spec

An SMT solver like Z3 will tell you quickly whether a program satisfies a specification, and give a proof if it does. It can't tell you whether the specification says anything useful. "The output is sorted" is satisfied by a function that returns an empty list.

The first thing we built, in the fall of 2025, turned English requirements into formal postconditions: "sort a list of integers" in, a statement about every pair of adjacent elements out, with a language model drafting and Z3 checking. The drafts were plausible and incomplete in ways that showed up only when something refuted them.

Everything we shipped afterwards, a payment processor whose specs were checked against production invariants and access control for AI agents with verified guarantees, used the same loop:

1. A model proposes a specification.
2. A verifier tries to break it and returns a counterexample.
3. The counterexample goes back to the model, which fixes the spec or the code.

## The loop

This is a miniature version. The checker enumerates every input in a small domain, so it is not a proof, and the agent steps are scripted rather than a live model. The verifier is real and both boxes are editable.

<div class="demo" data-demo="verify"></div>

The counterexample is the most useful object in the loop. It showed us that the first draft of `clamp` assumed `lo <= hi`, which nobody had written down. The mutation check at the bottom catches the quieter failure: a spec the correct code satisfies has passed half the test, and it also has to reject wrong programs. If a function that clamps to the wrong end, or returns an empty list, still satisfies it, the spec is too weak however green the check is.

## Why it matters for agents

A verifier is a cheap and exact oracle. A biology measurement can take weeks and is noisy, and a verifier answers in milliseconds. That is why reinforcement learning from verifiable rewards works well on code and math. As agents write more code, a model that can write a program but can't say what it should do has only moved the bug. Training the drafter against the verifier is the natural next step, since the reward is cheap and exact, and it is the setting for the small model we built for formal-verification benchmarks.

## Limits

Real verification handles unbounded inputs, loops that need invariants, quantifiers, and arithmetic that doesn't fit in a bounded domain. It also can't tell you whether the requirement was the right one, which stays a human's job.
