---
title: An over-engineered arbitrage bot, and the simple methods that beat it
date: 2025-08
kind: project
tags: markets, reinforcement learning, trading
blurb: Trading binary prediction markets in the summer of 2025, when they were fragmented and thin.
---

In the summer of 2025 I built a trading system for binary prediction markets, where a contract pays $1 if something happens and $0 if not, so its price should be a probability.

## Setup

The markets were fragmented and thin, with related contracts whose prices disagreed, and many of the people betting were going on feel or a headline. My starting thesis was that the average participant was making obvious mistakes, so basic techniques should be enough. That held up.

## What I built

I started with too much:

- A reinforcement-learning inventory manager. Holding too much of one side is the main risk and naive execution loses money to slippage. The policy cut execution slippage by about 30%.
- Sentiment signals from text, to get ahead of news.
- Arbitrage and hedging across related markets.
- A secure execution API with local signing, which made the trading loop about 6× faster.

Over a three-month stretch it made money consistently, on the order of 8% a week. That was a small experiment and I wouldn't extrapolate from it.

## What worked

The simple methods did better. When two related contracts implied inconsistent probabilities, or a price sat far from any sensible estimate of the payoff, the mispricings were large enough that a rule fit on a napkin captured most of the edge: buy the obviously cheap side and hedge when possible. The RL and sentiment stack added complexity and latency for a thin sliver of extra return.

Execution and inventory turned out to be most of the work, and the signal was the easy part. I'd look for where the market is wrong in a simple way before building anything clever, since sophistication only pays once the easy edge is gone. It stayed a summer project.
