---
title: Drug discovery before I knew what machine learning was
date: 2023-08
kind: research
tags: biology, drug discovery, docking
blurb: Screening 50,000+ compounds on a supercomputer for HIV and diabetic-cataract drugs, plus a literature review on viruses and cancer.
---

I started working in computational biology at the San Diego Supercomputer Center as a student and stayed for years. This was my first time doing ML on something that mattered to someone besides me.

## Two disease targets

**Aldose reductase and diabetic cataracts.** In people with diabetes, the enzyme aldose reductase turns excess sugar into a product that builds up in the lens of the eye and clouds it. Block the enzyme, slow the cataract. We built ML models to predict which small molecules inhibit it and screened candidates for it.

**HIV-1 protease.** This enzyme cuts viral proteins into functional pieces, and it's a classic drug target. We combined ML-based virtual screening with ligand docking to flag potent inhibitors.

Across the projects I ran large-scale screening of **50,000+ compounds** on the center's HPC clusters, built models that hit about **87% accuracy** at the binary "does it bind" question, and used docking simulations to augment misclassified examples, which improved predicted binding accuracy by about **20%**. I also supported three other student interns by running docking on their datasets to check that their ML models were learning something real, and taught them the tooling along the way.

The two screening projects became papers (*Advances in Ophthalmology Practice and Research*; *Artificial Intelligence Chemistry*), and I contributed to a third: a literature review on **anelloviruses and cancer**, in the *Journal of Infectious Diseases*, about a family of viruses found in almost everyone and the mixed evidence on whether they influence cancer.

## What this was really good for

Looking back, this is where I first ran into the problem I still work on: the expensive oracle. Docking and screening are cheap compared with a wet lab, and the wet lab is the only thing that is actually true. Everything between "the model says it binds" and "it works" is hope. When I later worked on [sample-efficient molecule design](ddamo.html) and on closing the loop with wet-lab experiments, I was working on the same problem from a better angle.

I also learned something about specialization that I wrote up [separately](high-school-research.html).
