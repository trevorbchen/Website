---
title: Drug discovery before I knew what machine learning was
date: 2023-08
kind: research
tags: biology, drug discovery, docking
blurb: Screening 50,000+ compounds on a supercomputer for HIV and diabetic-cataract drugs, plus a literature review on viruses and cancer.
---

I started working in computational biology at the San Diego Supercomputer Center as a student and stayed for years. It was my first ML work on a medical problem.

## Two disease targets

Aldose reductase and diabetic cataracts. In people with diabetes, the enzyme aldose reductase turns excess sugar into a product that builds up in the lens of the eye and clouds it. Block the enzyme, slow the cataract. We built ML models to predict which small molecules inhibit it and screened candidates for it.

HIV-1 protease. This enzyme cuts viral proteins into functional pieces, and it's a classic drug target. We combined ML-based virtual screening with ligand docking to flag potent inhibitors.

Across the projects I ran large-scale screening of **50,000+ compounds** on the center's HPC clusters, built models that hit about **87% accuracy** at the binary "does it bind" question, and used docking simulations to augment misclassified examples, which improved predicted binding accuracy by about **20%**. I also supported three other student interns by running docking on their datasets to check that their ML models were learning something real, and taught them the tooling along the way.

The two screening projects became papers (*Advances in Ophthalmology Practice and Research*; *Artificial Intelligence Chemistry*), and I contributed to a third: a literature review on **anelloviruses and cancer**, in the *Journal of Infectious Diseases*, about a family of viruses found in almost everyone and the mixed evidence on whether they influence cancer.

The oracle problem I work on now is already present here. Docking and screening are cheap next to a wet lab, and only the wet lab says whether a compound works. My later work on [sample-efficient molecule design](ddamo.html) is the same problem approached with that in mind.

I also wrote up something about specializing [separately](high-school-research.html).
