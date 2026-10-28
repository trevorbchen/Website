---
title: Mid-IR gratings for ultrafast lasers
date: 2024-05
kind: research
tags: physics, optics, nanofabrication
blurb: How to make a grating that stays efficient across an octave of mid-infrared light. My optics research before ML. Optical Materials Express and SPIE.
---

<div class="stats">
<div><b>&gt;90%</b><span>efficiency designed across 3.6 to 6.6 &micro;m</span></div>
<div><b>92%</b><span>measured at 4.3 &micro;m, against 94.2% from theory</span></div>
<div><b>7 &rarr; 2</b><span>prototype iterations after adding fabrication limits to the simulation</span></div>
<div><b>10 gratings</b><span>deployed at 5+ national labs, supporting over $1.3M of R&amp;D contracts</span></div>
</div>

My first research was in optics, and I worked on it for years. This was the main project: a patterned glass-and-metal surface that bends mid-infrared light efficiently enough to amplify an ultrafast laser without destroying it.

## Why a grating

An ultrafast laser fires pulses a few hundred femtoseconds long, and the peak power of such a pulse would destroy an amplifier. Chirped pulse amplification (Nobel Prize, 2018) stretches the pulse in time, amplifies the long pulse safely, and compresses it again. The stretcher and compressor are built from diffraction gratings, which send each wavelength in a slightly different direction so that a pair of them can lengthen or shorten a pulse.

Light hits the gratings several times, so a few percent of loss per bounce adds up. The target is a grating that puts nearly all the light into one order over a wide band.

For wavelength λ arriving at angle θᵢ on a grating of period d, order m leaves at

> sin θₘ = sin θᵢ + mλ/d

<div class="demo" data-demo="grating"></div>

Which order receives the energy depends on the groove shape.

## Blazing

A sinusoidal ripple splits light among many orders. A blazed grating has a sawtooth profile in which each groove is a tilted flat facet. With the right tilt, the mirror reflection off the facet points along the order you want, so nearly all the light goes there.

<figure><img src="../img/optics/profile.svg" alt="Cross-section of a blazed grating with the blaze angle and period marked"><figcaption>Blazed groove profile. In the Littrow configuration the light returns along its incoming direction.</figcaption></figure>

Mechanical ruling and holographic recording both struggle to make an accurate sawtooth in the mid-infrared. Ruled grooves have tool and surface roughness, and holographic ones tend toward rounded profiles.

## What we did

The target was a grating for a 100 fs laser at 4.3 µm that stays efficient over a very wide band.

<div class="pipe"><div><i>1</i><b>global optimization</b><span>find the groove profile</span></div><div><i>2</i><b>e-beam lithography</b><span>write the pattern</span></div><div><i>3</i><b>anisotropic wet etch</b><span>smooth blazed facets</span></div><div><i>4</i><b>Au + Al<sub>2</sub>O<sub>3</sub> coating</b><span>low loss, high damage threshold</span></div><div><i>5</i><b>test at 4.3 &micro;m</b><span>92% efficient</span></div></div>

The design step was a global optimization over groove geometry and coating stack, aiming for over 90% efficiency across 3.6 to 6.6 µm. The search space has many local optima. For fabrication we combined electron-beam lithography with anisotropic wet etching. The etch removes material along crystal planes at very different rates in different directions, which leaves smooth, flat facets at a fixed angle. We developed the process with the Penn State nanofabrication lab, and it improved efficiency by about 30%. The coating is gold plus alumina, with its thickness optimized to reduce absorption and raise the laser-induced damage threshold.

We measured prototypes at 4.3 µm, tunable over about 0.2 µm. The best one reached 92% diffraction efficiency against a theoretical 94.2% for the design.

<figure><img src="../img/optics/efficiency.svg" alt="Design target above 90% from 3.6 to 6.6 micrometers, with measured and theoretical efficiency at 4.3 micrometers"><figcaption>Schematic of the reported numbers, not a measured curve.</figcaption></figure>

## Two things I learned

In simulation I found a double-blazing feature, an extra structure in the groove profile that widened the usable bandwidth by roughly 50% and raised efficiency by about 20%.

An optimizer will propose grooves that no etch can make. After we built the fabrication limits into the design simulations, prototype iterations dropped from 7 to 2 and manufacturing error fell by about 80%.

The gratings are in use at five or more national labs, supporting over $1.3 million of R&D contracts. The work was published in *Optical Materials Express*, with a companion paper at SPIE on extending the design to single-cycle infrared lasers.
