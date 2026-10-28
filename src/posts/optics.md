---
title: Bending light for a living (kind of): mid-IR gratings and a borescope
date: 2024-05
kind: research
tags: physics, optics, nanofabrication
blurb: Years of optics research before I touched ML. Laser diffraction gratings now used at national labs, and a thermal camera that survives a flame.
---

My first real research was in physics, in optics, and I did it for years, so it deserves a proper write-up. Two projects.

## 1. Gratings for ultrafast lasers

High-energy ultrafast lasers stretch a pulse in time before amplifying it and compress it again afterward, so the amplifier doesn't burn itself. The workhorse inside the stretcher and compressor is a **diffraction grating**, and a bad grating costs you energy on every bounce. You want one that is efficient across a *broad* range of wavelengths, in the **mid-infrared**, which is where conventional mechanical ruling and holographic recording struggle to make accurate blazed grooves.

Grating physics fits in one line. Light of wavelength λ hitting a grating of period d at angle θᵢ leaves in order m at

> sin θₘ = mλ/d − sin θᵢ

Play with it:

<div class="demo" data-demo="grating"></div>

*Drag the sliders. The orders that can propagate are the ones where sin θ stays between −1 and 1. A blazed grating shapes the grooves so most of the energy lands in a single order. Getting the groove profile right is the whole game.*

What we did (this was at Spectral Energies, with the Penn State nanofabrication lab):

- Used **electron-beam lithography with anisotropic wet etching** to make near-perfect blazed grooves, instead of ruling or holography.
- Ran **global optimization** on the design for greater than **90% efficiency across 3.6 to 6.6 µm**, with a hybrid metal–dielectric coating (gold plus alumina) tuned to minimize absorption and raise the laser-induced damage threshold.
- Tested prototypes at 4.3 µm: the best sample hit **92% diffraction efficiency against a theoretical 94.2%**.
- Found, in simulation, a "**double-blazing**" groove feature that widened bandwidth by about 50% and raised efficiency by about 20%.
- Folded fabrication constraints directly into the simulation, which cut manufacturing error dramatically and cut prototype iterations from **7 to 2**.

The result was 10 gratings in use at 5+ national labs, supporting over $1.3M of R&D contracts. This was published in *Optical Materials Express* and as an SPIE proceeding.

## 2. A thermal camera that lives inside a jet engine

Measuring the surface temperature of turbine parts is hard because the flame around them lights up everything in the visible and near-infrared. Working in the **long-wave infrared (8 to 14 µm)** sidesteps most of that interference.

With Paul Hsu and Tim Lieuwen's group, I worked on a compact LWIR borescope: a probe a couple of centimeters across in a water-cooled housing designed to survive flame temperatures up to about 2400 K at 50 bar. We demonstrated it by imaging a V-gutter bluff body cooled with nitrogen in a lab testbed, where it measured surface temperature accurately with little background noise and tracked the transient cooling. My part was the optimization that designed the sensing system and the calibration against a blackbody. It produced a journal paper (*Measurement Science and Technology*) and three conference papers.

## What I took from it

Optics taught me to distrust my own simulations: a design that looks perfect on screen meets the limits of fabrication on the first prototype, so you learn to put the constraints *into* the model. I think the same instinct is why I like AI-for-science work now. The oracle is expensive and the real world is the final judge.
