"""Static site generator for trevorbchen's site.

Run `python3 build.py` after editing content. Posts live in src/posts/*.md
(front matter + markdown). Hobby pages, the home page and the research page are
defined below. Output is plain static HTML next to this file.
"""
import html
import pathlib
import re
import sys

import markdown

ROOT = pathlib.Path(__file__).parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT

NAV = [("index.html", "home"), ("research.html", "research"), ("blog.html", "blog"),
       ("Trevor_Chen_Resume.pdf", "cv")]

# hobby "holes": slug, label, hover tip, margin position (left %, top %, px size)
HOLES = [
    ("crochet", "crochet", "amigurumi. currently learning stitches.", 3, 15, 64),
    ("guitar", "guitar", "currently learning Let Her Go.", 1.5, 37, 36),
    ("skateboarding", "skateboarding", "falling is part of the curriculum.", 4, 60, 52),
    ("movies", "movies", "Spider-Verse, 12 Angry Men, unpopular opinions.", 2, 82, 42),
    ("badminton", "badminton", "ask me for a game.", 95, 20, 58),
    ("figure-skating", "figure skating", "not competitive. I can do an axel.", 97, 48, 34),
    ("anime", "anime / manga / LN", "I don't believe in real books.", 94, 74, 70),
]

TICKER = ("working on closed-loop discovery with Krause (ETH) + Arnold (Caltech) *** "
          "NeurIPS 2026 accepted *** ICLR + CVPR under review *** "
          "currently learning RL, evals, operating systems, distributed computing *** "
          "poke the holes. poke the plushes. ")

KATEX = """  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]})"></script>
"""


def page(path, title, body, current="", extra_head="", extra_js=()):
    root = "../" * path.count("/")
    nav = "\n".join(
        f'      <a href="{root}{href}"{" aria-current=\"page\"" if href == current else ""}>{label}</a>'
        for href, label in NAV)
    holes_margin = "".join(
        f'<a class="hole" href="{root}hobbies/{slug}.html" data-label="{label}" data-tip="{tip}" '
        f'style="left:{x}%;top:{y}%;width:{s}px;height:{round(s * 0.86)}px" aria-label="{label}"></a>'
        for slug, label, tip, x, y, s in HOLES)
    holes_row = "".join(
        f'<a class="hole-mini" href="{root}hobbies/{slug}.html"><span class="blob"></span>{label}</a>'
        for slug, label, tip, x, y, s in HOLES)
    scripts = "".join(f'  <script src="{root}{s}"></script>\n' for s in extra_js)
    doc = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="Trevor Chen: Caltech researcher. Diffusion models, AI for science, interpretability.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><ellipse cx='52' cy='50' rx='40' ry='34' fill='%23ff2e88'/><ellipse cx='48' cy='50' rx='40' ry='34' fill='%2319d3e6'/><ellipse cx='50' cy='50' rx='38' ry='32' fill='%23111015'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}style.css">
{extra_head}</head>
<body data-root="{root}">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="boil"><feTurbulence id="boil-noise" type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="0"/><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter>
    <filter id="warp"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="1" seed="3"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter>
  </svg>
  <canvas id="dots" aria-hidden="true"></canvas>
  <div class="holes" aria-label="hobbies">{holes_margin}</div>
  <div id="tip" class="tip" role="tooltip"></div>

  <header class="top">
    <div>
      <p class="logo"><a href="{root}index.html">TREVOR CHEN</a></p>
      <p class="tagline">diffusion / ai for science / interpretability</p>
    </div>
    <nav class="nav" aria-label="site">
{nav}
    </nav>
  </header>
  <div class="ticker" aria-hidden="true"><div class="track"><span>{TICKER}</span><span>{TICKER}</span></div></div>

  <main>
{body}
  </main>

  <footer>
    <div class="holes-row"><span class="holes-label">the holes</span>{holes_row}</div>
    <div class="plush-stage" id="plush-stage">
      <canvas id="plush" aria-label="Two plush toys, a penguin and a panda. Drag them around."></canvas>
      <div class="bubble" id="bubble"></div>
      <p class="plush-hint">drag the plushes. poke them.</p>
    </div>
    <div class="foot-line">
      <span class="tag">2026 &middot; trevorbchen</span>
      <span class="links"><a href="mailto:trevorbchen@gmail.com">email</a><a href="https://github.com/trevorbchen">github</a><a href="https://scholar.google.com/citations?user=N_DNZMUAAAAJ">scholar</a><a href="https://www.linkedin.com/in/trevorbchen/">linkedin</a></span>
    </div>
  </footer>

  <div id="portal" aria-hidden="true"></div>
  <script src="{root}site.js"></script>
  <script src="{root}fx.js"></script>
  <script src="{root}plush.js"></script>
  <script src="{root}demos.js"></script>
{scripts}</body>
</html>
"""
    dest = OUT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(doc, encoding="utf-8")


def panel(name, inner, color="", extra=""):
    cls = f"panel {color}".strip()
    return f"""      <section class="{cls}"{extra}>
        <span class="caption">{name}</span>
{inner}
      </section>"""


# ---------------------------------------------------------------- posts
def load_posts():
    posts = []
    for f in sorted((ROOT / "src" / "posts").glob("*.md")):
        raw = f.read_text(encoding="utf-8")
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
        if not m:
            raise SystemExit(f"{f.name}: missing front matter")
        meta = dict(line.split(":", 1) for line in m.group(1).split("\n") if ":" in line)
        meta = {k.strip(): v.strip() for k, v in meta.items()}
        meta["slug"] = f.stem
        meta["md"] = m.group(2)
        posts.append(meta)
    return posts


def render_md(text, math=False):
    stash = []
    if math:
        def keep(mo):
            stash.append(mo.group(0))
            return f"@@MATH{len(stash) - 1}@@"
        text = re.sub(r"\$\$.+?\$\$", keep, text, flags=re.S)
        text = re.sub(r"(?<![\\\w])\$(?!\s)[^$\n]+?(?<!\s)\$(?!\w)", keep, text)
    out = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"])
    if math:
        for i, s in enumerate(stash):
            out = out.replace(f"@@MATH{i}@@", html.escape(s, quote=False))
    out = re.sub(r'<p><img alt="([^"]*)" src="([^"]*)" ?/?></p>\s*<p><em>(.*?)</em></p>',
                 r'<figure><img alt="\1" src="\2"><figcaption>\3</figcaption></figure>', out, flags=re.S)
    return out


KIND_PILL = {"research": "cyan", "project": "pink", "essay": "gold"}


def build_posts(posts):
    for p in posts:
        math = p.get("math", "no") == "yes"
        body_html = render_md(p["md"], math=math)
        pill = KIND_PILL.get(p.get("kind", ""), "")
        tags = " ".join(f'<span class="pill {pill}">{t.strip()}</span>' for t in p.get("tags", "").split(","))
        inner = f"""      <article class="panel post">
        <span class="caption">{p.get("kind", "post")}</span>
        <p class="back"><a href="../blog.html">&larr; all posts</a></p>
        <h1>{html.escape(p["title"])}</h1>
        <p class="meta">{p["date"]} &middot; {tags}</p>
{body_html}
      </article>"""
        page(f"posts/{p['slug']}.html", f"{p['title']} | Trevor Chen", inner, "blog.html",
             extra_head=KATEX if math else "")


# ---------------------------------------------------------------- home
def build_home():
    hero = panel("hi", """          <div class="hero">
          <div>
          <h2>hi, i'm trevor.</h2>
          <p class="lede">I'm an undergrad at Caltech doing research in diffusion models and AI for science, mostly bio, with side quests in interpretability and theory.</p>
          <p>I'm lucky to work with <a href="https://www.yisongyue.com/">Yisong Yue</a> and <a href="https://www.vision.caltech.edu/">Pietro Perona</a> at Caltech,
          <a href="https://las.inf.ethz.ch/">Andreas Krause</a>'s group at ETH Zurich, and <a href="https://cheme.caltech.edu/groups/fha/">Frances Arnold</a>'s lab.
          Before that I co-founded <a href="https://ascade.co/">Ascade</a>, which was accepted to YC F25, until May 2026, then went back to research (<a href="posts/leaving-startups.html">here's why</a>).</p>
          <p class="small">This is also where I put the things that don't fit in a paper: failed theories, bad bets, and hobbies. The black holes on the sides are doors.</p>
          </div>
          <div>
            <a class="portal" href="renderer.html" title="open the black hole renderer"><canvas id="cam" aria-label="A black hole bending starlight. Click to open the full renderer."></canvas></a>
            <p class="portal-note">click the black hole</p>
          </div>
          </div>""")
    now = panel("currently", """          <ul class="now">
            <li><b>Working on</b> closed-loop discovery with Andreas Krause's group (ETH Zurich) and Frances Arnold's lab: language models propose hypotheses, generative models turn them into designs, and the wet lab says yes or no.</li>
            <li><b>Writing</b> two submissions: sparse-autoencoder dictionaries (<a href="posts/sae-families.html">CVPR</a>) and why diffusion models memorize late (<a href="posts/memorization.html">ICLR</a>).</li>
            <li><b>Learning</b> reinforcement learning, evals, operating systems and distributed computing.</li>
          </ul>""", "pink")
    show = panel("start here", """          <div class="grid grid-3">
            <a class="comic" href="posts/pangram.html">
              <span class="pow">BOTH WAYS</span>
              <span class="pill pink">AI safety</span>
              <h3>I broke an AI-image detector</h3>
              <p>Real photos flagged as AI, AI images passing as real, and what the company's co-founder said back.</p>
            </a>
            <a class="comic" href="posts/ddamo.html">
              <span class="pow">58x</span>
              <span class="pill gold">NeurIPS 2026</span>
              <h3>Steering discrete diffusion</h3>
              <p>Four design decisions for feedback-efficient molecule optimization, and the one the rest were waiting on.</p>
            </a>
            <div class="comic soon">
              <span class="pow">SOON</span>
              <span class="pill violet">theory</span>
              <h3>A theory of reasoning</h3>
              <p>In progress. Check back.</p>
            </div>
          </div>""", "cyan")
    page("index.html", "Trevor Chen", "\n\n".join([hero, now, show]), "index.html")


# ---------------------------------------------------------------- research
def row(title, blurb, tags, link=None, preview=None, soon=False):
    t = f'<a href="{link}">{title}</a>' if link else title
    pv = f'<canvas class="pv" width="200" height="110" data-pv="{preview}"></canvas>' if preview else ""
    cls = "row soon" if soon else "row"
    pills = "".join(f'<span class="pill">{x}</span>' for x in tags)
    return f'            <li class="{cls}"><div class="row-text"><h3>{t}</h3><p>{blurb}</p><div>{pills}</div></div>{pv}</li>'


PUBS = [
    ('<a href="https://arxiv.org/abs/2607.02834">On the Design Space of Discrete Diffusion Online Adaptation for Molecular Optimization</a>',
     "<b>T. Chen*</b>, A. Dai*, J. Yang, R. De Santi, et al., M. Al-Shedivat, Y. Yue", "NeurIPS 2026", False),
    ("How Excess Latent Dimensionality Delays Memorization in Diffusion Models",
     "<b>T. Chen</b>, R. Shahbaba", "ICLR 2027 &middot; under review", True),
    ('<a href="https://icml.cc/virtual/2026/72322">How Excess Latent Dimensionality Delays Memorization in Diffusion Models</a>',
     "<b>T. Chen</b>, R. Shahbaba, K. Peng, A. Garg", "ICML 2026 Workshop on High-dimensional Learning Dynamics", False),
    ("Objective Geometry Steers Sparse Autoencoder Vocabularies",
     "<b>T. Chen</b>, I. Demler, P. Perona", "CVPR 2027 &middot; under review", True),
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


def build_research():
    def area(name, items, color):
        return panel(name, '          <ul class="rows">\n' + "\n".join(items) + "\n          </ul>", color)

    intro = panel("research", """          <h2>research</h2>
          <p class="lede">I like problems where a model has to <em>find</em> something (a molecule, an enzyme, a feature, a failure mode) with as few expensive questions as possible.</p>
          <p>Most of my current work is in <b>diffusion models</b> and <b>AI for science</b>, especially biology. I started in physics and moved through biology and then ML. Hover a row for a tiny live preview, click it for the write-up.</p>""", "gold")
    physics = area("physics", [
        row("Mid-IR gratings and a thermal camera for jet engines",
            "Diffraction gratings in use at national labs; an infrared borescope that survives flame.",
            ["optics", "nanofabrication"], "posts/optics.html", "grating"),
    ], "")
    bio = area("biology", [
        row("Drug discovery on a supercomputer",
            "Screening 50,000+ compounds for HIV-1 protease and aldose-reductase inhibitors; a review on anelloviruses and cancer.",
            ["docking", "virtual screening"], "posts/bio.html", "docking"),
    ], "pink")
    sci = area("ai for science", [
        row("Steering discrete diffusion for molecular optimization",
            "Online adaptation with 58x fewer oracle calls. NeurIPS 2026.",
            ["diffusion", "RL", "NeurIPS"], "posts/ddamo.html", "noise"),
        row("Closed-loop discovery with wet-lab feedback",
            "LLM-proposed hypotheses distilled into generative models for enzyme and protein design, with ETH Zurich and the Arnold lab. In progress.",
            ["current", "ETH", "Caltech"], None, "loop", soon=True),
    ], "cyan")
    interp = area("interpretability", [
        row("Sparse autoencoders you can steer",
            "A family of objectives that choose which features a model learns. CVPR 2027, under review.",
            ["SAEs", "CVPR"], "posts/sae-families.html", "heat"),
        row("Interpretability explorer",
            "Click a token in a real transformer and trace its attention and logit lens across layers.",
            ["tool", "GPT-2"], "explorer.html", "heat"),
    ], "violet")
    theory = area("theory", [
        row("Why diffusion models memorize late",
            "A spectral buffer from extra latent dimensions. ICML HiLD 2026; ICLR 2027 under review.",
            ["diffusion", "generalization"], "posts/memorization.html", "noise"),
        row("A theory of reasoning",
            "Coming soon.", ["in progress"], None, None, soon=True),
        row("A diffusion theory that was wrong",
            "My first mental model of why diffusion works, seven toy experiments, and why it failed.",
            ["essay"], "posts/diffusion-gaussians.html", "noise"),
    ], "")
    other = area("also", [
        row("Formal verification at Ascade",
            "Verified software for AI agents. Not research on this page, but the same itch.",
            ["startup", "verification"], "https://ascade.co/", "graph"),
    ], "gold")
    pubs = "\n".join(
        f'            <li>{t}<span class="who">{w}</span><span class="where{" soon" if soon else ""}">{v}</span></li>'
        for t, w, v, soon in PUBS)
    pubpanel = f"""      <section class="panel cyan" id="pubs">
        <span class="caption">publications</span>
          <p class="small">* equal contribution &middot; also on <a href="https://scholar.google.com/citations?user=N_DNZMUAAAAJ">google scholar</a> &middot; <a href="Trevor_Chen_Resume.pdf">cv</a></p>
          <ol class="pubs">
{pubs}
          </ol>
      </section>"""
    page("research.html", "research | Trevor Chen", "\n\n".join([intro, physics, bio, sci, interp, theory, other, pubpanel]),
         "research.html")


# ---------------------------------------------------------------- blog index
def build_blog(posts):
    def key(p):
        y, _, m = p["date"].partition("-")
        return (p.get("featured") != "yes", -int(y), -int(m or 0))
    items = []
    for p in sorted(posts, key=key):
        star = ' <span class="pill gold">featured</span>' if p.get("featured") == "yes" else ""
        items.append(
            f'            <li data-kind="{p.get("kind", "")}"><span class="lvl">{p["date"]} &middot; {p.get("kind", "")}</span>'
            f'<a href="posts/{p["slug"]}.html">{html.escape(p["title"])}</a>{star}<p>{p.get("blurb", "")}</p></li>')
    body = panel("blog", f"""          <h2>blog</h2>
          <p>Write-ups of my research, projects, and a few opinions. Filter:
            <button class="filter on" data-f="">all</button><button class="filter" data-f="research">research</button><button class="filter" data-f="project">projects</button><button class="filter" data-f="essay">essays</button>
            <a class="pill" href="explorer.html">tool: interpretability explorer</a> <a class="pill pink" href="renderer.html">tool: black hole renderer</a></p>
          <ul class="posts">
{chr(10).join(items)}
          </ul>""", "pink")
    page("blog.html", "blog | Trevor Chen", body, "blog.html")


# ---------------------------------------------------------------- hobbies
def shelf(items):
    return '<ul class="shelf">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


HOBBY_PAGES = {
    "crochet": ("Crochet", "Hole 01", """
          <p class="lede">I crochet <b>amigurumi</b>: small stuffed creatures stitched in spirals.</p>
          <p>Right now I'm <b>learning stitches</b>. Every new stitch unlocks a shape you couldn't make before, which makes it the most reliably satisfying learning curve I have.</p>
          <p>The plushes at the bottom of this site are, spiritually, crochet. Go poke them.</p>"""),
    "guitar": ("Guitar", "Hole 02", """
          <p class="lede">Currently learning: <b>Let Her Go</b>.</p>
          <p>I'm at the stage where my fingertips have opinions and my chord changes are a sequence of small lies. It's good for me.</p>"""),
    "skateboarding": ("Skateboarding", "Hole 03", """
          <p class="lede">I skateboard.</p>
          <p>It's the one hobby where falling down is an official part of the learning process, which I find weirdly reassuring when research is also mostly falling down.</p>"""),
    "movies": ("Movies", "Hole 04", f"""
          <p class="lede">Yes, the site is Spider-Verse on purpose.</p>
          <h3>favorites</h3>
          {shelf(["<b>Spider-Man: Into the Spider-Verse</b> (and Across)", "<b>Arcane</b> (show)", "<b>12 Angry Men</b>", "<b>The Truman Show</b>",
                  "<b>Avatar: The Last Airbender</b> (show)", "<b>A Clockwork Orange</b>", "<b>Fight Club</b>", "<b>The Battle of Algiers</b>",
                  "<b>Eternal Sunshine of the Spotless Mind</b>"])}
          <h3>unpopular opinions</h3>
          <p>I don't really like <b>Inception</b>, <b>Interstellar</b>, <b>The Godfather</b>, <b>Mission Impossible</b>, or the <b>Avengers</b> movies.</p>
          <p class="small">(I did render a black hole because of Kip Thorne, so I'm not fully immune to Interstellar.)</p>"""),
    "badminton": ("Badminton", "Hole 05", """
          <p class="lede">I play badminton.</p>
          <p>Ask me for a game.</p>"""),
    "figure-skating": ("Figure skating", "Hole 06", """
          <p class="lede">I used to figure skate, never competitively.</p>
          <p>I can do an <b>axel</b>. It's the only jump that takes off going forward, which is why a single axel is a full one-and-a-half rotations. It's also the first one that feels like flying.</p>"""),
    "anime": ("Anime, manga &amp; light novels", "Hole 07", f"""
          <p class="lede">I don't believe in real books. wtf.</p>
          <h3>anime / manga</h3>
          {shelf(["<b>A Silent Voice</b>", "<b>Takopi's Original Sin</b>", "<b>Goodnight Punpun</b>", "<b>Three Days of Happiness</b>",
                  "<b>Princess Tutu</b>", "<b>Code Geass</b>", "<b>Vagabond</b>", "<b>Monster</b>", "<b>Jujutsu Kaisen</b>", "<b>Medalist</b>",
                  "<b>Bungo Stray Dogs</b>", "<b>Steins;Gate</b>"])}
          <h3>(web) light novels</h3>
          {shelf(["<b>Mother of Learning</b>", "<b>Lord of Mysteries</b>"])}"""),
}


def build_hobbies():
    for slug, (title, hole, inner) in HOBBY_PAGES.items():
        body = panel(hole, f"""          <p class="back"><a href="../index.html">&larr; back to the surface</a></p>
          <h2>{title}</h2>{inner}""", "violet")
        page(f"hobbies/{slug}.html", f"{title} | Trevor Chen", body, "")


# ---------------------------------------------------------------- tools
def build_renderer():
    r = panel("black hole renderer", """          <h2>black hole renderer</h2>
          <p class="small">A real-time, physically based ray tracer in a WebGL shader. Every pixel integrates a light ray through Schwarzschild spacetime (Binet's equation, RK4). Drag to orbit, scroll to zoom.</p>
          <div class="rview">
            <canvas id="bh" aria-label="Ray-traced Schwarzschild black hole with an accretion disk"></canvas>
            <div class="rhud" id="rhud">...</div>
          </div>
          <div class="controls" id="rcontrols">
            <label>inclination <input type="range" id="c-incl" min="2" max="88" value="78"></label>
            <label>distance <input type="range" id="c-dist" min="20" max="120" value="58"></label>
            <label>disk temperature <input type="range" id="c-temp" min="3000" max="14000" value="5400" step="100"></label>
            <label>exposure <input type="range" id="c-exp" min="0.3" max="3" value="1.3" step="0.05"></label>
            <label>disk outer radius <input type="range" id="c-rout" min="10" max="30" value="16"></label>
            <label>render scale <input type="range" id="c-scale" min="0.35" max="1" value="0.7" step="0.05"></label>
            <label><input type="checkbox" id="c-dop" checked> Doppler beaming</label>
            <label><input type="checkbox" id="c-grav" checked> gravitational redshift</label>
            <label><input type="checkbox" id="c-ss"> 2x2 supersampling</label>
            <label><input type="checkbox" id="c-spin" checked> auto-orbit</label>
          </div>""", "cyan")
    notes = panel("what you're looking at", """          <p>The shadow is not the event horizon. Light that gets within about <b>2.6 Schwarzschild radii</b> (the critical impact parameter, 3&radic;3 M) is captured, so the dark disk is about 2.6x bigger than the horizon. The thin bright ring is the photon sphere's image.</p>
          <p>The accretion disk is a <b>geometrically thin, optically thick</b> disk with a Novikov-Thorne-style temperature profile, starting at the innermost stable orbit (6 M). Its colors include relativistic <b>Doppler beaming</b> (the approaching side is brighter and bluer) and <b>gravitational redshift</b>. The same disk appears <b>twice</b>: once directly and once lensed over the top of the hole.</p>
          <p class="small">What it doesn't do: no spin (Kerr), no disk self-lensing or returning radiation, no volumetric corona. See the <a href="posts/black-hole.html">CUDA write-up</a> for the original project.</p>""", "gold")
    page("renderer.html", "black hole renderer | Trevor Chen", "\n\n".join([r, notes]), "", extra_js=("renderer.js",))


if __name__ == "__main__":
    posts = load_posts()
    build_posts(posts)
    build_home()
    build_research()
    build_blog(posts)
    build_hobbies()
    build_renderer()
    exp = ROOT / "explorer_page.py"
    if exp.exists():
        import importlib.util
        spec = importlib.util.spec_from_file_location("explorer_page", exp)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.build(page, panel)
    print("built", len(list(OUT.rglob("*.html"))), "pages")
