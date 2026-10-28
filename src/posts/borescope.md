---
title: A thermal camera that survives a flame
date: 2023-03
kind: research
tags: optics, sensing, thermal imaging
blurb: A compact long-wave infrared borescope for reading surface temperature inside an engine while a flame burns next to it. Measurement Science and Technology, AIAA and SPIE.
---

<div class="stats">
<div><b>8&ndash;14 &micro;m</b><span>long-wave infrared band</span></div>
<div><b>2,400 K</b><span>flame temperature the water-cooled housing is designed for, at 50 bar</span></div>
<div><b>10&times;</b><span>the spatial resolution of competing designs</span></div>
<div><b>98%</b><span>accuracy after blackbody calibration</span></div>
</div>

In a gas turbine, a combustor liner or blade has to run hot enough to be efficient and cool enough not to fail, and the margin is small. A thermocouple gives a handful of points and disturbs the flow. What you want is an image of the surface temperature from inside the running engine. This project was a compact camera on the end of a probe, with the optics, housing and calibration needed to turn pixels into temperatures.

## Why long-wave infrared

Every warm surface glows, and the brightness at each wavelength follows from its temperature, so a thermal camera measures the glow and inverts for temperature. The flame glows too: hot gases and soot emit strongly across the visible and near-infrared and swamp the surface. The long-wave infrared (8 to 14 µm) is quieter, so the surface can be seen through the flame.

## The probe

A borescope is a long, thin optical probe for looking inside an engine without taking it apart. This one sits inside a custom water-cooled housing, about 19 mm across outside and 10 mm inside, designed for flame temperatures up to about 2,400 K at 50 bar. Water carries heat away from the optics while the front of the probe faces the flame.

## My part

I worked on the design and the calibration. For the design I developed optimization algorithms for a robust sensing system, which gave about ten times the spatial resolution of competing designs.

A camera reports counts, not temperatures. To convert, you point it at a blackbody at known temperatures, record each pixel's response, and fit a curve. No two pixels respond identically, so one global curve leaves structure in the image. We fit a regression for each pixel, and the temperature readings came out accurate to about 98%.

## Demonstration

We tested the camera on a V-gutter bluff body, a standard flame-holding shape, cooled with nitrogen in a laboratory combustion testbed. The camera measured surface temperature accurately with little background noise and followed the transient cooling when the nitrogen came on, which a handful of thermocouples would not resolve.

This was published as [*A compact LWIR borescope sensor for 2D engine component surface temperature measurement*](https://doi.org/10.1088/1361-6501/acc048) in *Measurement Science and Technology*, with conference papers at [AIAA AVIATION](https://doi.org/10.2514/6.2023-3580), [SPIE](https://doi.org/10.1117/12.2672622) and [Optica](https://opg.optica.org/abstract.cfm?uri=LACSEA-2022-LM1B.5). The work was with Paul Hsu and Tim Lieuwen's group.
