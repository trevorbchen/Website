---
title: Rendering a black hole on the GPU
date: 2026-06
kind: project
tags: CUDA, graphics, physics
blurb: A real-time CUDA ray tracer that bends light through Schwarzschild spacetime, built with Kevin Peng. It started because I'd just met Kip Thorne.
---

I'd taken a computer graphics class with Al Barr and, around the same time, got to meet Kip Thorne, the Caltech physicist who won a Nobel for gravitational waves and whose equations drove the black hole in *Interstellar*. (Yes, I find it funny that I'm not a fan of the movie.) The two things collided: *could I render one, properly, in real time?*

Kevin Peng and I built it for our CS 179 (GPU programming) final. Kevin wrote the geodesic integrator, the part that traces how light bends. I wrote the camera, the shading and the CUDA rendering kernels. [Code on GitHub.](https://github.com/trevorbchen/CS_179_final)

**You can also try a version in your browser**: the [black hole renderer](../renderer.html), a WebGL shader that traces the same physics. Drag to orbit.

## The trick: stay in the plane

Schwarzschild spacetime is spherically symmetric, so every photon's path lies in one fixed plane through the black hole. Instead of integrating the full 4D problem, each ray integrates three numbers in polar coordinates (r, φ) plus a velocity, which halves memory bandwidth on the GPU:

```
dr/dλ   = v_r
dv_r/dλ = L²(r − 3) / r⁴      ← exact Schwarzschild null geodesic
dφ/dλ   = L / r²
```

Near the photon sphere (r = 3M), curvature is extreme, so the RK4 step size shrinks adaptively. Every ray ends in one of three ways: swallowed by the horizon, hits the **accretion disk** (shaded as a hot blackbody), or escapes to the starfield.

## On the GPU

Each pixel is independent, so the double loop over the image becomes a CUDA kernel, one thread per pixel in 16×16 blocks. On top of that: bloom and HDR tone mapping as post-processing kernels, Doppler beaming on the disk, and an interactive browser viewer with live controls and FPS profiling.

## Keeping it honest

Pretty pictures are easy to fake, so we wrote a physics test suite against general relativity:

| test | result |
|------|--------|
| weak-field deflection vs. GR (b = 50) | 0.44% error |
| photon-sphere capture at b = 3√3 | captured / escaped correctly at ±0.1 |
| energy + angular-momentum drift | ~10⁻⁶ |
| time reversal | retraces within 0.16% |
| spherical symmetry | 1.8 × 10⁻⁷ max error |

It also has CPU–GPU parity tests so the CUDA port provably matches the reference implementation.

## The natural next step

The big missing piece is **spin**: a Kerr black hole drags spacetime around with it and gives the famous lopsided shadow. The geodesics are no longer planar, which breaks the central trick above, so the kernel layout would need rethinking.
