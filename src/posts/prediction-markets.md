---
title: I over-engineered an arbitrage machine, and simple methods still won
date: 2025-08
kind: project
tags: markets, reinforcement learning, trading
blurb: Binary prediction markets in the early days: fragmented, thin, and full of degenerate gamblers. Notes on what worked and what was embarrassing.
---

In the summer of 2025 I built a trading system for binary prediction markets. These are markets where a contract pays $1 if something happens and $0 if it doesn't, so its price is supposed to be a probability.

## The setup

Back then these markets had no central venue doing the job of keeping prices coherent. They were fragmented, thin, and full of related contracts whose prices didn't agree with each other. And a large share of the people betting were, to put it kindly, **degenerate gamblers**: betting on feel, on a headline, on their team. My starting thesis was blunt: *the average participant is dumb, so basic techniques should be enough to win.*

It turned out to be true.

## What I built first (too much)

I did what engineers do and built an absurdly elaborate machine:

- A **reinforcement-learning inventory manager**: holding too much of one side is the main risk, and naive execution leaks money to slippage. The RL policy cut execution slippage by about 30%.
- **Sentiment signals** from text, to get ahead of news.
- **Arbitrage and hedging** across related markets.
- A secure execution API with local signing, which made the trading loop about 6× faster.

Over a three-month stretch this made money consistently, on the order of 8% a week. That was a small experiment and I wouldn't extrapolate it.

## What actually worked

The embarrassing finding: **the simple methods beat the over-engineered ones.** When two related contracts implied inconsistent probabilities, or a price sat far from any sensible estimate of the expected payoff, the mispricings were so large that you didn't need a clever model. Buy the obviously cheap side, hedge when you could, don't get fancy. The RL and sentiment stack added complexity and latency for a thin sliver of extra return, because the pricing errors were so big that a rule fit on a napkin captured most of the edge.

## What I took from it

- **Find where the market is dumb before you build anything smart.** All the cleverness in the world is wasted if the inefficiency is simple.
- **Fancy ML earns its keep when the easy edge is gone**, and in a young, fragmented market the easy edge is everywhere.
- Execution and inventory are most of trading. The signal is the easy part.

It stayed a summer project, and I'm happy to have it as a lesson in not over-building.
