---
title: I learned to beat a Connect 4 bot, then lost to my roommate
date: 2026-10
kind: essay
tags: reinforcement learning, on-policy vs off-policy, catastrophic forgetting
blurb: A small story about distribution shift, catastrophic forgetting, and why distilling ideas from a teacher beats copying its moves.
---

I got obsessed with Connect 4 and decided to learn it the way I'd train a model: play against a strong bot, over and over.

It worked, in a narrow sense. I started beating the bot. I discovered tricks that win from most random openings, learned which columns tend to be winning *levels* (rows, really: parity matters a lot in this game), and got good at building **threats**, the moves that force the opponent to respond so you can set up a double. I felt great.

Then I played my roommate and lost.

## What went wrong

My roommate didn't play like the bot. The bot is a very strong player of a very specific kind, and *I had learned a policy tuned to beat it*. Everything I'd absorbed, which openings the bot falls into, how it responds to a given threat, assumed its habits. A human who plays loosely, makes odd developing moves, and ignores "correct" principles pushes me into positions I'd never seen.

And worse: **I'd forgotten basic strategy.** Because I'd spent hundreds of games on exotic tricks that worked against a bot, I wasn't practicing the plain fundamentals (control the center, watch both diagonals, don't give away a square you need) that a human opponent exploits immediately. This is **catastrophic forgetting**, in a human.

## It's the on-policy / off-policy problem

This is the same tension you see in RL:

- **On-policy** learning trains on the distribution *you* actually produce. It's stable but narrow, and it costs a lot of games.
- **Off-policy** learning, training on someone else's behavior (the bot's), is sample-efficient and can teach you a lot fast. But you're now optimizing for a distribution you'll never face, and you're **fragile off the distribution**: nothing in the training signal told you how to handle positions the teacher never reaches.

I had gone off-policy against an opponent whose state distribution looked nothing like the one I'd meet. The more I squeezed out of the bot, the more specialized to it I got, which is exactly what over-optimizing against a fixed opponent does to a model.

## What fixed it

I changed what I took from the bot. Instead of copying what it *plays*, I tried to understand *why* it plays it: what makes a position winning, how threats stack, why a given square is poison. In other words, I **distilled ideas rather than moves**, and I kept my own prior (the basics) intact while updating it. Learn from the teacher, but stay close to what you already knew.

That's the same instinct as a KL penalty to the base model in fine-tuning: take the signal, don't let it drag you somewhere you can't recover from.

Here's what I mean by a threat you can't answer: Yellow to move on this board, and the game is already over.

<div class="c4" data-board="....... ....... ....... ....... ...Y... ..RRR.Y" data-caption="Red has three in a row on the bottom with both ends open. Yellow can block only one."></div>

Once I thought about the game in those terms, I stopped losing to people. I'm now confident that I won't lose to many of them, which is a statement about the people, not the bot.

## The takeaway

When a strong teacher is available, the temptation is to maximize against it. Resist. Optimize against a *fixed* opponent and you learn the opponent. Then check yourself against someone who plays *differently* before you believe you've learned the game.
