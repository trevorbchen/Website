---
title: A thermal camera that survives a flame
date: 2023-03
kind: research
tags: optics, sensing, thermal imaging
blurb: Reading the surface temperature of engine hardware while a flame burns next to it. A compact long-wave infrared borescope, from design to calibration. Measurement Science and Technology, AIAA and SPIE.
---

<div class="stats">
<div><b>8&ndash;14 &micro;m</b><span>the long-wave infrared band the camera looks in</span></div>
<div><b>2,400 K</b><span>flame temperature the water-cooled housing is designed to survive, at 50 bar</span></div>
<div><b>10&times;</b><span>the spatial resolution of competing designs</span></div>
<div><b>98%</b><span>accuracy of the temperature readings after calibration against a blackbody</span></div>
</div>

Inside a running gas turbine, the hardware that matters most is also the hardest to measure. A combustor liner or turbine blade has to be hot enough to be efficient and not so hot that it fails, and the margin between the two is small. If you want to know where the hot spots are, a thermocouple gives you a handful of points and disturbs the flow around them. What you want is an *image* of the surface temperature, taken from inside the engine, while it runs.

That is what this project was: a compact camera on the end of a probe, with the optics, the housing and the calibration to turn pixels into temperatures.

## Why the long-wave infrared

Every warm surface glows, and how brightly it glows at each wavelength follows from its temperature. That is the principle of thermal imaging: measure the glow, invert for the temperature. The difficulty here is that the flame glows too. Hot combustion gases and soot emit strongly across much of the visible and near-infrared, which swamps the signal from the surface you actually care about.

The **long-wave infrared (8 to 14 micrometres)** is a quieter region. Looking there reduces the interference from hot gases and soot, so the surface can be seen through the flame instead of being drowned by it.

## A borescope in a water jacket

A **borescope** is a long, thin optical probe, the kind a mechanic uses to look inside an engine without taking it apart. This one is a compact long-wave infrared design. The probe sits inside a custom water-cooled housing, about 19 millimetres across on the outside and 10 on the inside, designed to survive flame temperatures up to about 2,400 K at a pressure of 50 bar. The camera stays alive because the water carries the heat away from the optics while the front of the probe looks into the flame.

## My part: design and calibration

My work on the project was twofold. The first half was the **design**: I developed optimization algorithms to design a robust sensing system. The design we arrived at has about ten times the spatial resolution of competing designs.

The second half was **calibration**. A camera produces counts, not temperatures. To turn one into the other you point it at a **blackbody**, a source whose temperature you know exactly, record what each pixel reports across a range of temperatures, and fit a curve. The wrinkle is that no two pixels respond identically, so a single global curve leaves visible structure in the image. We calibrated **pixel by pixel**, fitting a regression for each one, and the resulting temperature readings were accurate to about 98%.

## The demonstration

We tested the camera on a **V-gutter bluff body**, a standard flame-holding shape, cooled with nitrogen in a laboratory combustion testbed. The camera measured the surface temperature accurately with little background noise, and it followed the transient cooling as the nitrogen came on, which is exactly the kind of event you can't see with a handful of thermocouples.

The work produced a journal paper, [*A compact LWIR borescope sensor for 2D engine component surface temperature measurement*](https://doi.org/10.1088/1361-6501/acc048) in *Measurement Science and Technology*, and conference papers at [AIAA AVIATION](https://doi.org/10.2514/6.2023-3580), [SPIE](https://doi.org/10.1117/12.2672622), and [Optica](https://opg.optica.org/abstract.cfm?uri=LACSEA-2022-LM1B.5). It was with Paul Hsu and Tim Lieuwen's group.

## What I took from it

An image sensor doesn't measure temperature; it measures counts and a model tells you what they mean. Most of the accuracy in the final result came from being careful about that model: the blackbody, the per-pixel fits, the cooling jacket. I think about this every time I work with an expensive oracle now. The number you get back is only as good as the process that turns the raw signal into a number.
