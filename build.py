import pathlib, sys

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent

TICKER = ("★ NeurIPS 2026 accepted ★ ICLR 2027 + CVPR 2027 under review ★ "
          "now: closed-loop LLM-guided discovery with ETH Zurich + the Arnold Lab ★ "
          "Ascade accepted to YC F25 ★ this site contains zero photos and always will ★ "
          "best viewed with a cursor ★")

NAV = [("index.html", "home"), ("research.html", "research"), ("blog.html", "blog"),
       ("Trevor_Chen_Resume.pdf", "cv.pdf")]


def page(path, title, body, current):
    root = "../" * path.count("/")
    nav = "\n".join(
        f'        <a href="{root}{href}"{" aria-current=\"page\"" if href == current else ""}>{label}</a>'
        for href, label in NAV)
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="Trevor Chen — Caltech researcher and founder. Generative models, AI for science, interpretability.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%230c0a1d'/><circle cx='50' cy='50' r='30' fill='none' stroke='%23ff2e88' stroke-width='8'/><circle cx='50' cy='50' r='20' fill='black'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bungee&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}style.css">
</head>
<body>
  <header class="banner">
    <p class="logo"><a href="{root}index.html">TREVOR CHEN</a></p>
    <p class="subtitle">generative models // ai for science // interpretability</p>
    <div class="ticker" aria-label="news"><div class="track"><span>{TICKER}</span><span aria-hidden="true">{TICKER}</span></div></div>
  </header>

  <div class="site">
    <aside>
      <nav class="panel pink" aria-label="site">
        <div class="bar"><span>nav.exe</span><span class="dots">■■■</span></div>
        <div class="body nav">
{nav}
        </div>
      </nav>

      <div class="panel cyan">
        <div class="bar"><span>black_hole.cam</span><span class="dots">● REC</span></div>
        <canvas id="cam" aria-label="Animated black hole bending starlight"></canvas>
        <div class="cam-caption">hover me. live gravitational lensing.</div>
      </div>

      <div class="panel">
        <div class="bar"><span>status.txt</span><span class="dots">■■■</span></div>
        <dl class="body status">
          <dt>building</dt><dd>closed-loop discovery @ ETH Zurich + Arnold Lab</dd>
          <dt>studying</dt><dd>applied + computational math @ Caltech</dd>
          <dt>shipping</dt><dd>formally verified infra @ Ascade</dd>
          <dt>links</dt>
          <dd><a href="mailto:trevorbchen@gmail.com">email</a> · <a href="https://github.com/trevorbchen">github</a> · <a href="https://scholar.google.com/citations?user=N_DNZMUAAAAJ">scholar</a> · <a href="https://www.linkedin.com/in/trevorbchen/">linkedin</a></dd>
          <dt>you've visited</dt><dd><span class="counter" id="visits">000001</span> times</dd>
        </dl>
      </div>
    </aside>

    <main>
{body}
    </main>
  </div>

  <footer>
    <div class="badges" aria-hidden="true">
      <span class="badge b1">cuda<br>inside</span>
      <span class="badge b2">no photos<br>allowed</span>
      <span class="badge b3">hand-coded<br>html</span>
      <span class="badge b4">best viewed<br>w/ cursor</span>
      <span class="badge b5">lensing<br>enabled</span>
    </div>
    <p>© 2026 trevor chen · last updated oct 2026 · no frameworks were harmed</p>
  </footer>

  <script src="{root}site.js"></script>
</body>
</html>
"""
    dest = OUT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html, encoding="utf-8")


def panel(name, inner, color=""):
    cls = f"panel {color}".strip()
    return f"""      <section class="{cls}">
        <div class="bar"><span>{name}</span><span class="dots">■■■</span></div>
        <div class="body">
{inner}
        </div>
      </section>"""


# ---------------- home ----------------
home = "\n\n".join([
    panel("hello.txt", """          <h2>hi, i'm trevor.</h2>
          <p class="lede">I'm an undergrad at Caltech building learning systems that discover things.</p>
          <p>I work with <a href="https://las.inf.ethz.ch/">Andreas Krause</a> (ETH Zurich) and
          <a href="https://cheme.caltech.edu/groups/fha/">Frances Arnold</a> on closed-loop, LLM-guided scientific
          discovery; with <a href="https://www.yisongyue.com/">Yisong Yue</a> on sample-efficient generative design and
          diffusion theory; and with <a href="https://www.vision.caltech.edu/">Pietro Perona</a> on interpretability.</p>
          <p>I also founded <a href="https://ascade.co/">Ascade</a> (accepted to YC F25), where we build formally
          verified infrastructure for AI agents. Before all that I spent years in optics labs and supercomputer
          clusters, which is why there are laser gratings in my <a href="research.html#pubs">publication list</a>.</p>""", "gold"),
    panel("now.log", """          <ul class="log">
            <li><time>2026</time>started closed-loop discovery with ETH Zurich (Krause group) and the Arnold Lab</li>
            <li><time>2026</time><span class="pill gold">NeurIPS</span> design space of online adaptation for molecular diffusion models — accepted</li>
            <li><time>2026</time><span class="pill">ICLR</span><span class="pill pink">CVPR</span> memorization + sparse autoencoder papers under review</li>
            <li><time>Aug 2026</time><a href="posts/pangram.html">broke an AI-image detector in both directions</a></li>
            <li><time>Jun 2026</time><a href="posts/black-hole.html">wrote a real-time black hole renderer in CUDA</a></li>
            <li><time>Jun 2026</time>SURF fellowship in the Perona Vision Lab</li>
            <li><time>2025</time>Ascade accepted to Y Combinator F25</li>
          </ul>""", "pink"),
    panel("highlights", """          <div class="grid grid-3">
            <a class="comic" href="research.html">
              <span class="pow">58×!</span>
              <span class="pill gold">NeurIPS 2026</span>
              <h3>Sample-efficient molecule design</h3>
              <p>RL fine-tuning for diffusion molecule generators that needs 58× fewer oracle calls.</p>
            </a>
            <a class="comic" href="posts/pangram.html">
              <span class="pow">BOTH WAYS</span>
              <span class="pill pink">AI safety</span>
              <h3>Breaking an AI detector</h3>
              <p>AI images passing as human; real photos flagged as AI.</p>
            </a>
            <a class="comic" href="posts/black-hole.html">
              <span class="pow">CUDA</span>
              <span class="pill">GPU</span>
              <h3>Black hole renderer</h3>
              <p>Bending light through curved spacetime, one pixel per thread.</p>
            </a>
          </div>""", "cyan"),
])
page("index.html", "Trevor Chen", home, "index.html")

# ---------------- research ----------------
pubs = [
    ('<a href="https://arxiv.org/abs/2607.02834">On the Design Space of Discrete Diffusion Online Adaptation for Molecular Optimization</a>',
     "<b>T. Chen*</b>, A. Dai*, J. Yang, R. De Santi, et al., M. Al-Shedivat, Y. Yue", "NeurIPS 2026", False),
    ("How Excess Latent Dimensionality Delays Memorization in Diffusion Models",
     "<b>T. Chen</b>, R. Shahbaba", "ICLR 2027 · under review", True),
    ('<a href="https://icml.cc/virtual/2026/72322">How Excess Latent Dimensionality Delays Memorization in Diffusion Models</a>',
     "<b>T. Chen</b>, R. Shahbaba, K. Peng, A. Garg", "ICML 2026 Workshop on High-dimensional Learning Dynamics", False),
    ("Objective Geometry Steers Sparse Autoencoder Vocabularies",
     "<b>T. Chen</b>, I. Demler, P. Perona", "CVPR 2027 · under review", True),
    ('<a href="https://doi.org/10.1093/infdis/jiae626">Anelloviruses and Cancer</a>',
     "J. Y. Tang*, <b>T. Chen*</b>, V. L. Kouznetsova, I. F. Tsigelny", "The Journal of Infectious Diseases, 2025", False),
    ('<a href="https://opg.optica.org/ome/fulltext.cfm?uri=ome-14-5-1336&amp;id=549158">Development of Broadband High-Efficiency Mid-IR Gratings for High-Energy Ultrafast Lasers</a>',
     "<b>T. Chen</b>, B. Liu, J. A. McCoy, et al.", "Optical Materials Express, 2024", False),
    ('<a href="https://doi.org/10.1117/12.3032561">Enabling Ultra-Broadband High-Efficiency Gratings for Single-Cycle Infrared Lasers</a>',
     "<b>T. Chen</b>, P. S. Hsu", "SPIE Nanoengineering, 2024", False),
    ('<a href="https://doi.org/10.1088/1361-6501/acc048">A Compact LWIR Borescope Sensor for 2D Engine Component Surface Temperature Measurement</a>',
     "P. S. Hsu*, <b>T. Chen*</b>, A. Roy, et al.", "Measurement Science and Technology, 2023", False),
    ('<a href="https://doi.org/10.2514/6.2023-3580">Development of Compact LWIR Borescope Sensor for Non-contact 2D Engine Component Surface Temperature Measurement</a>',
     "A. Roy, P. S. Hsu, A. Zhang, <b>T. Chen</b>, et al.", "AIAA AVIATION Forum, 2023", False),
    ('<a href="https://doi.org/10.1117/12.2672622">2D High Temperature Sensor Development Using LWIR Borescope</a>',
     "<b>T. Chen</b>, A. Zhang, A. Roy, P. S. Hsu, O. Bibik, S. Adhikari", "SPIE Infrared Sensors, Devices, and Applications XIII, 2023", False),
    ('<a href="https://doi.org/10.1016/j.aopr.2023.09.002">Search of Inhibitors of Aldose Reductase for Treatment of Diabetic Cataracts Using Machine Learning</a>',
     "<b>T. Chen</b>, R. Chen, A. You, V. L. Kouznetsova, I. F. Tsigelny", "Advances in Ophthalmology Practice and Research, 2023", False),
    ('<a href="https://doi.org/10.1016/j.aichem.2023.100014">Machine-Learning-Based Virtual Screening and Ligand Docking Identify Potent HIV-1 Protease Inhibitors</a>',
     "A. K. Gao, <b>T. Chen</b>, V. L. Kouznetsova, I. F. Tsigelny", "Artificial Intelligence Chemistry, 2023", False),
    ('<a href="https://opg.optica.org/abstract.cfm?uri=LACSEA-2022-LM1B.5">Compact Borescope Design for 2D Long-Wavelength IR Thermal Imaging Sensing</a>',
     "<b>T. Chen</b>, P. S. Hsu", "Optica LACSEA, 2022", False),
]
pub_items = "\n".join(
    f'            <li>{t}<span class="who">{w}</span><span class="where{" soon" if soon else ""}">{v}</span></li>'
    for t, w, v, soon in pubs)

research = "\n\n".join([
    panel("research.dir", """          <h2>research</h2>
          <p>I like problems where a model has to <em>find</em> something — a molecule, an enzyme, a feature, a failure
          mode — with as few expensive questions as possible.</p>
          <div class="grid">
            <article class="comic">
              <span class="pill gold">AI for science</span>
              <h3>Closed-loop discovery</h3>
              <p>A frozen LLM proposes mechanistic hypotheses; each is distilled into a domain-specific flow model that
              generates testable designs, and wet-lab results certify or refute it — in campaigns of ~10² measurements.
              ETH Zurich (Krause) + the Arnold Lab.</p>
            </article>
            <article class="comic">
              <span class="pill pink">drug discovery</span>
              <h3>Sample-efficient generative design</h3>
              <p>Online RL fine-tuning, active learning, and reward shaping for diffusion molecule generators: the best
              search baseline's score with 58× fewer oracle calls (16× on proteins). NeurIPS 2026, with Genesis Molecular AI.</p>
            </article>
            <article class="comic">
              <span class="pill violet">theory</span>
              <h3>Why diffusion models memorize</h3>
              <p>Extra latent dimensions act as a spectral buffer that delays when a diffusion model starts copying its
              training data (3.6× later on CelebA). ICML HiLD 2026; ICLR 2027 under review.</p>
            </article>
            <article class="comic">
              <span class="pill">interpretability</span>
              <h3>Steerable sparse autoencoders</h3>
              <p>A family of SAE training objectives that steer which features a model learns — targeted feature
              discovery instead of seed luck. Plus SAEs on every layer of a diffusion transformer. CVPR 2027 under review.</p>
            </article>
          </div>""", "gold"),
    f"""      <section class="panel cyan" id="pubs">
        <div class="bar"><span>publications.bib</span><span class="dots">■■■</span></div>
        <div class="body">
          <h2>publications</h2>
          <p style="font-size:13px;color:var(--muted)">* equal contribution · also on <a href="https://scholar.google.com/citations?user=N_DNZMUAAAAJ">google scholar</a> · full <a href="Trevor_Chen_Resume.pdf">cv</a></p>
          <ol class="pubs">
{pub_items}
          </ol>
        </div>
      </section>""",
])
page("research.html", "research — Trevor Chen", research, "research.html")

# ---------------- blog index ----------------
blog = panel("blog/", """          <h2>blog</h2>
          <p>Projects, write-ups, and things I broke.</p>
          <ul class="posts">
            <li><time>2026-08-03</time><a href="posts/pangram.html">I broke an AI-image detector (both ways)</a>
              <p>Red-teaming Pangram: real photos flagged as AI, AI images passing as human, and why I'm not releasing the code.</p></li>
            <li><time>2026-06-12</time><a href="posts/black-hole.html">Rendering a black hole on the GPU</a>
              <p>A real-time CUDA ray tracer that bends light through Schwarzschild spacetime, plus a physics test suite to keep it honest.</p></li>
            <li><time>2025-08-30</time><a href="posts/prediction-markets.html">Trading binary prediction markets with RL</a>
              <p>A summer of inventory management, slippage, and sentiment signals.</p></li>
          </ul>""", "pink")
page("blog.html", "blog — Trevor Chen", blog, "blog.html")


def post(slug, title, date, tags, inner, color):
    body = f"""      <article class="panel {color} post">
        <div class="bar"><span>posts/{slug}.html</span><span class="dots">■■■</span></div>
        <div class="body">
          <p class="back"><a href="../blog.html">← all posts</a></p>
          <h1>{title}</h1>
          <p class="meta">{date} · {tags}</p>
{inner}
        </div>
      </article>"""
    page(f"posts/{slug}.html", f"{title} — Trevor Chen", body, "blog.html")


post("pangram", "I broke an AI-image detector (both ways)", "2026-08-03",
     '<span class="pill pink">AI safety</span><span class="pill">red-teaming</span>', """          <p>Pangram is one of the most popular AI-content detectors, and a lot of people online treat its verdict as
          final. I wanted to know how much weight that verdict can actually carry, so I spent some time poking at
          the image detector.</p>

          <h3>1. Ordinary upscaling looks "AI"</h3>
          <p>Upsampling a real image from 128×128 to 512×512 consistently got it flagged as AI-generated. That isn't
          an extreme transformation; plenty of everyday image pipelines upscale without the user ever knowing. My
          worry is less about this one setting and more about honest people getting flagged for using normal tools.</p>

          <h3>2. It can be pushed in both directions</h3>
          <p>Using out-of-distribution loss functions, I trained a VAE that makes <em>real</em> photos get flagged as AI,
          and a GAN-VAE that makes <em>AI-generated</em> images pass as human. Same family of models, opposite failure
          modes — which means a verdict alone can't be treated as proof either way.</p>

          <div class="callout">I'm not releasing the code or the training details. A turnkey "make AI images undetectable" tool
          is a misuse risk, and the point was to show the gap, not to widen it. I shared details with Pangram directly.</div>

          <h3>3. Where the line should be</h3>
          <p>Pangram's co-founder replied to my thread with a fair question: if heavy upscaling hallucinates new
          detail, should that count as AI? I think there's a real taxonomy problem here — "AI-generated", "AI-edited",
          and "touched by a standard upscaler" probably shouldn't share one label.</p>

          <h3>Why I'm still optimistic about detection</h3>
          <blockquote>Detecting AI has an infinite stream of data to learn from, while bypassing detectors is a very
          low-data, sparse-reward task.</blockquote>
          <p>Long term, I think detectors should keep the advantage (short of truly inhuman mimicry). AI detection is
          important work. For now, though, a detector's output should be one piece of evidence, not the final word.</p>""", "pink")

post("black-hole", "Rendering a black hole on the GPU", "2026-06-12",
     '<span class="pill">CUDA</span><span class="pill gold">physics</span>', """          <p>For my CS 179 (GPU programming) final, Kevin Peng and I built a real-time renderer for a Schwarzschild
          black hole. Kevin wrote the geodesic integrator; I wrote the camera, the shading, and the CUDA rendering
          kernels. <a href="https://github.com/trevorbchen/CS_179_final">Code on GitHub.</a></p>

          <h3>The trick: stay in the plane</h3>
          <p>Schwarzschild spacetime is spherically symmetric, so every photon's path lies in one fixed plane.
          Instead of integrating the full 8-dimensional phase space, each ray integrates three numbers in polar
          coordinates (r, φ) — which halves memory bandwidth on the GPU:</p>
          <pre>dr/dλ   = v_r
dv_r/dλ = L²(r − 3) / r⁴     ← exact Schwarzschild geodesic
dφ/dλ   = L / r²</pre>
          <p>Near the photon sphere (r = 3) curvature gets intense, so the RK4 step size shrinks adaptively. Each ray
          ends up captured by the horizon, hitting the accretion disk (shaded as a blackbody), or escaping to the
          starfield skybox.</p>

          <h3>On the GPU</h3>
          <p>Every pixel is independent, so the double loop becomes a CUDA kernel with one thread per pixel in 16×16
          blocks. On top of that: bloom and HDR tone mapping as post-processing kernels, Doppler beaming on the disk,
          and a browser viewer where you can orbit, zoom, and tweak the physics live.</p>

          <h3>Keeping it honest</h3>
          <p>Pretty pictures are easy to fake, so we wrote a physics test suite against general relativity:</p>
          <table>
            <tr><th>test</th><th>result</th></tr>
            <tr><td>weak-field deflection vs. GR (b = 50)</td><td>0.44% error</td></tr>
            <tr><td>photon sphere capture at b = 3√3</td><td>captured / escaped correctly at ±0.1</td></tr>
            <tr><td>energy + angular momentum drift</td><td>~10⁻⁶</td></tr>
            <tr><td>time reversal</td><td>retraces within 0.16%</td></tr>
            <tr><td>spherical symmetry</td><td>1.8 × 10⁻⁷ max error</td></tr>
          </table>
          <p>Plus CPU–GPU parity tests so the CUDA port matches the reference implementation.</p>
          <p>The little <em>black_hole.cam</em> in the sidebar is a much simpler cousin: a thin-lens approximation in a
          WebGL shader, not real geodesics. Still fun to hover.</p>""", "cyan")

post("prediction-markets", "Trading binary prediction markets with RL", "2025-08-30",
     '<span class="pill violet">RL</span><span class="pill gold">markets</span>', """          <p>Over summer 2025 I built a medium-frequency trading system for binary prediction markets — the kind
          where every contract settles at 0 or 1.</p>
          <h3>What I built</h3>
          <ul>
            <li><b>Inventory management with reinforcement learning.</b> Holding too much of one side is the main risk, and
            naive execution leaks money to slippage. An RL policy that managed inventory and hedging cut execution
            slippage by about 30%.</li>
            <li><b>Signals.</b> Sentiment analysis combined with arbitrage and hedging strategies across related markets;
            over a 3-month window this returned a consistent ~8% per week.</li>
            <li><b>Execution.</b> A secure execution API with local cryptographic signing that made the trading loop about
            6× faster.</li>
          </ul>
          <p>Short-window returns like that say more about a market's inefficiencies than about any lasting edge,
          and they shrink as markets mature. The most durable thing I took away was how much of trading is
          engineering: latency, inventory, and not losing money on the way in and out.</p>""", "gold")

print("built", sorted(str(p.relative_to(OUT)) for p in OUT.rglob("*.html")))
