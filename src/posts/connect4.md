---
title: i got good at connect 4 by farming a bot and then my roommate cooked me
date: 2026-07
kind: essay
tags: shitpost, reinforcement learning, skill issue
blurb: a story about distribution shift, catastrophic forgetting, and why you should not grind a single opponent. also i lost to a roommate. it's fine.
---

so i got obsessed with connect 4. normal behavior. and i decided the only dignified way to learn it was the way i'd train a model: play a strong bot until my brain updates.

**it worked.** i started beating the bot. i found tricks that win from like most openings. i learned which rows are winning rows (parity!!! it's all parity!!!). i got really good at making threats, you know, the moves where the opponent has to respond or die, so you can set up a double. i felt like a genius. i was a menace. i was Him.

then i played my roommate.

and i lost.

## what happened

my roommate does not play like the bot. my roommate plays like a guy who has never read a strategy guide and also doesn't care. weird developing moves. no respect for "correct." just vibes. and i was suddenly in positions i had literally never seen, because the bot would never ever go there.

and the real insult: **i forgot how to play connect 4.** like the actual basics. control the center. check both diagonals. don't hand over a square you needed. because i had spent hundreds of games learning galaxy-brain tricks that only work on a bot, so the boring fundamentals were just. gone. that's catastrophic forgetting, but in a human, and it's my fault.

## this is just on-policy vs off-policy lol

if you've ever opened an RL textbook this is the whole chapter:

- **on-policy**: learn from the games you actually play. stable. slow. costs a million games. very "touch grass."
- **off-policy**: learn from someone else's games (the bot's). way more sample efficient. also you are now optimizing for a distribution you will never ever see again, and you are made of glass. nobody told your value function what to do in the positions the teacher never reaches. copium with extra steps.

i went off-policy on a guy whose states looked nothing like my roommate's states. the harder i farmed the bot, the more specialized i got to the bot. i was a bot-hunter. a one-trick pony. the pony was very good. the pony lost.

## the fix

i stopped copying what the bot *does* and started working out *why* it does it. what makes a position actually winning. how threats stack. why some squares are poison. basically i **distilled ideas instead of moves** and kept my own prior (the boring basics) mostly intact while i updated it.

this is a KL penalty to the base model, but for your brain. take the signal, don't let it drag you somewhere you can't come back from. staying true to your prior. very based. very regularized.

here is a threat you can't answer. yellow to move. it's over. gg.

<div class="c4" data-board="....... ....... ....... ....... ...Y... ..RRR.Y" data-caption="red has three in a row on the bottom with both ends open. yellow can only block one."></div>

after that i stopped losing to people. i'm now confident i will not lose to most of them, which is a statement about the people, not the bot.

## the takeaway

if a strong teacher shows up, you will want to max against it. do not. you will learn the teacher. then go play someone who plays *differently* before you decide you learned the game.

