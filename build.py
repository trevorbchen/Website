"""Static site generator for trevorbchen's site.

Run `python3 build.py` after editing content. Posts live in src/posts/*.md
(front matter + markdown). Hobby pages, the home page and the research page are
defined below. Output is plain static HTML next to this file.
"""
import html
import pathlib
import re
import sys
import time

import markdown

ROOT = pathlib.Path(__file__).parent
V = int(time.time())
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT

NAV = [("index.html", "home"), ("research.html", "research"), ("blog.html", "blog"),
       ("learning.html", "learning"), ("Trevor_Chen_Resume.pdf", "cv")]

# hobby "holes": slug, label, hover tip, margin position (left %, top %, px size)
HOLES = [
    ("crochet", "crochet", "amigurumi. currently learning stitches.", -1.2, 21, 76),
    ("guitar", "guitar", "currently learning Let Her Go and Stitches.", 4.6, 43, 26),
    ("skateboarding", "skateboarding", "", 0.6, 68, 44),
    ("movies", "movies", "favorites and unpopular opinions.", 5.6, 88, 20),
    ("badminton", "badminton", "", 98.2, 12, 56),
    ("figure-skating", "figure skating", "used to. I can do an axel.", 94.4, 37, 22),
    ("anime", "anime / manga / LN", "I don't believe in real books.", 97.8, 61, 84),
]

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
        f'<a class="hole" href="{root}hobbies.html#{slug}" data-label="{label}" data-tip="{tip}" '
        f'style="left:{x}%;top:{y}%;width:{s}px;height:{round(s * 0.86)}px" aria-label="{label}"></a>'
        for slug, label, tip, x, y, s in HOLES)
    scripts = "".join(f'  <script src="{root}{s}?v={V}"></script>\n' for s in extra_js)
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
  <link rel="stylesheet" href="{root}style.css?v={V}">
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

  <main>
{body}
  </main>

  <footer>
    <div class="foot-line">
      <span class="tag">2026 &middot; trevorbchen</span>
      <span class="links"><a href="mailto:trevorbchen@gmail.com">email</a><a href="https://github.com/trevorbchen">github</a><a href="https://scholar.google.com/citations?user=N_DNZMUAAAAJ">scholar</a><a href="https://www.linkedin.com/in/trevorbchen/">linkedin</a><a href="{root}hobbies.html">hobbies</a></span>
    </div>
  </footer>

  <canvas id="plush" aria-hidden="true"></canvas>
  <div class="bubble" id="bubble"></div>

  <div id="portal" aria-hidden="true"></div>
  <script src="{root}site.js?v={V}"></script>
  <script src="{root}fx.js?v={V}"></script>
  <script src="{root}plush.js?v={V}"></script>
  <script src="{root}demos.js?v={V}"></script>
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
             extra_head=KATEX if math else "", extra_js=tuple(p["js"].split()) if p.get("js") else ())


# ---------------------------------------------------------------- home
def build_home():
    hero = panel("hi", """          <div class="hero">
          <div>
          <h2>hi, i'm trevor.</h2>
          <p class="lede">I'm an undergrad at Caltech doing research in machine learning, mostly on diffusion models and AI for science.</p>
          <p>I keep coming back to a few questions: how to explore and exploit most efficiently when every experiment is expensive, how to make reinforcement learning work in the sciences, and how to understand why a model fails rather than just that it does.</p>
          <p>I work with <a href="https://www.yisongyue.com/">Yisong Yue</a> and <a href="https://www.vision.caltech.edu/">Pietro Perona</a> at Caltech, <a href="https://las.inf.ethz.ch/">Andreas Krause</a>'s group at ETH Zurich, and <a href="https://cheme.caltech.edu/groups/fha/">Frances Arnold</a>'s lab. Before that, I co-founded <a href="https://ascade.co/">Ascade</a>.</p>
          </div>
          <div>
            <a class="portal" href="renderer.html" title="open the black hole renderer"><canvas id="cam" aria-label="A black hole bending starlight. Opens the full renderer."></canvas></a>
          </div>
          </div>""")
    now = panel("currently", """          <ul class="now">
            <li><b>Working on</b> closed-loop discovery with Andreas Krause's group (ETH Zurich) and Frances Arnold's lab: language models propose hypotheses, generative models turn them into designs, and the wet lab says yes or no.</li>
            <li><b>Writing</b> two submissions: sparse-autoencoder dictionaries (<a href="posts/sae-families.html">CVPR</a>) and why diffusion models memorize late (<a href="posts/memorization.html">ICLR</a>).</li>
            <li><b>Learning</b> reinforcement learning, evals, operating systems and distributed computing (<a href="learning.html">my reading list</a>).</li>
          </ul>""", "pink")
    show = panel("start here", """          <div class="grid grid-3">
            <a class="comic" href="posts/pangram.html">
              <span class="pill pink">AI safety</span>
              <h3>I broke an AI-image detector</h3>
              <p>Real photos flagged as AI, AI images passing as real, and what the company's co-founder said back.</p>
            </a>
            <a class="comic" href="posts/ddamo.html">
              <span class="pill gold">NeurIPS 2026</span>
              <h3>Better molecules, fewer experiments</h3>
              <p>Steering a molecule generator with a few thousand expensive measurements. NeurIPS 2026.</p>
            </a>
            <a class="comic" href="posts/interpretability.html">
              <span class="pill">interpretability</span>
              <h3>Looking inside a model</h3>
              <p>Logit lens, attention, head ablation and a sparse autoencoder that trains in your browser.</p>
            </a>
            <div class="comic soon">
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
          <p>Underneath most of it are a few questions I keep returning to. How do you explore and exploit most efficiently when each experiment costs something? How do you make reinforcement learning work in AI for science? How do you interpret a model's failure modes instead of only measuring them? Right now that mostly means diffusion models and biology.</p>""", "gold")
    physics = area("physics", [
        row("Mid-IR gratings for ultrafast lasers",
            "Broadband diffraction gratings, now in use at national labs.",
            ["optics", "nanofabrication"], "posts/optics.html", "grating"),
        row("A thermal camera that survives a flame",
            "A compact long-wave infrared borescope for imaging engine hardware from inside a running flame.",
            ["optics", "sensing"], "posts/borescope.html", None),
    ], "")
    bio = area("biology", [
        row("Drug discovery on a supercomputer",
            "Screening 50,000+ compounds for HIV-1 protease and aldose-reductase inhibitors; a review on anelloviruses and cancer.",
            ["docking", "virtual screening"], "posts/bio.html", "docking"),
    ], "pink")
    sci = area("ai for science", [
        row("Better molecules, fewer experiments",
            "Steering a diffusion model with a few expensive measurements: the same result with 58x fewer oracle calls. NeurIPS 2026.",
            ["diffusion", "RL", "NeurIPS"], "posts/ddamo.html", "noise"),
        row("Closed-loop discovery with wet-lab feedback",
            "LLM-proposed hypotheses distilled into generative models for enzyme and protein design, with ETH Zurich and the Arnold lab. In progress.",
            ["current", "ETH", "Caltech"], None, "loop", soon=True),
    ], "cyan")
    interp = area("interpretability", [
        row("Sparse autoencoders you can steer",
            "Changing the loss to choose which features a sparse autoencoder learns. CVPR 2027, under review.",
            ["SAEs", "CVPR"], "posts/sae-families.html", "heat"),
        row("Looking inside a model",
            "Logit lens, attention, head ablation and a sparse autoencoder you can train live, all in the browser.",
            ["demos", "GPT-2", "SAEs"], "posts/interpretability.html", "heat"),
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
        row("Building a tiny vLLM",
            "A paged KV cache and continuous batching, checked against Hugging Face, with recorded runs on a laptop GPU and an A100.",
            ["inference", "GPU", "systems"], "posts/inference-engine.html", None),
        row("Specs, verifiers and counterexamples",
            "Formal verification for AI agents at Ascade, and a loop you can break in the browser.",
            ["verification", "demo"], "posts/verification-loop.html", "graph"),
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
    page("research.html", "research | Trevor Chen", "\n\n".join([intro, sci, interp, theory, bio, physics, other, pubpanel]),
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
           </p>
          <ul class="posts">
{chr(10).join(items)}
          </ul>""", "pink")
    page("blog.html", "blog | Trevor Chen", body, "blog.html")


# ---------------------------------------------------------------- hobbies
def shelf(items):
    return '<ul class="shelf">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def build_hobbies():
    def hob(slug, name, inner=""):
        return f'          <li class="hob" id="{slug}"><h3>{name}</h3>{inner}</li>'

    items = []
    for p in sorted(posts, key=key):
        star = ' <span class="pill gold">featured</span>' if p.get("featured") == "yes" else ""
        items.append(
            f'            <li data-kind="{p.get("kind", "")}"><span class="lvl">{p["date"]} &middot; {p.get("kind", "")}</span>'
            f'<a href="posts/{p["slug"]}.html">{html.escape(p["title"])}</a>{star}<p>{p.get("blurb", "")}</p></li>')
    body = panel("blog", f"""          <h2>blog</h2>
          <p>Write-ups of my research, projects, and a few opinions. Filter:
            <button class="filter on" data-f="">all</button><button class="filter" data-f="research">research</button><button class="filter" data-f="project">projects</button><button class="filter" data-f="essay">essays</button>
           </p>
          <ul class="posts">
{chr(10).join(items)}
          </ul>""", "pink")
    page("blog.html", "blog | Trevor Chen", body, "blog.html")


# ---------------------------------------------------------------- hobbies
def shelf(items):
    return '<ul class="shelf">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def build_hobbies():
    def hob(slug, name, inner=""):
        return f'          <li class="hob" id="{slug}"><h3>{name}</h3>{inner}</li>'

    takes = [
        ("Inception", "A clever premise and a great score. I never cared about anyone inside the dream."),
        ("Interstellar", "The ideas are bigger than the people, and the film stops to tell you that love is a physical force."),
        ("The Godfather", "I can see why it's loved. It just never grabbed me."),
        ("Mission: Impossible", "Terrific stunts, and I've forgotten the plot before I leave the theatre."),
        ("The Avengers films", "Enormous and fun, but a fight where nobody can really lose never holds my attention."),
    ]
    takes_html = '<ul class="takes">' + "".join(f"<li><b>{t}</b><span>{d}</span></li>" for t, d in takes) + "</ul>"
    items = [
        hob("movies", "Movies", f"""
            <p class="k">favorites</p>
            {shelf(["<b>Spider-Man: Into the Spider-Verse</b> (and Across)", "<b>Arcane</b> (show)", "<b>12 Angry Men</b>", "<b>The Truman Show</b>",
                    "<b>Avatar: The Last Airbender</b> (show)", "<b>A Clockwork Orange</b>", "<b>Fight Club</b>", "<b>The Battle of Algiers</b>",
                    "<b>Eternal Sunshine of the Spotless Mind</b>"])}
            <p class="k">unpopular opinions</p>
            {shelf(["<b>Inception</b>", "<b>Interstellar</b>", "<b>The Godfather</b>", "<b>Mission: Impossible</b>", "<b>The Avengers films</b>"])}"""),
        hob("anime", "Anime, manga &amp; light novels", f"""
            <p>I don't believe in real books.</p>
            <p class="k">anime / manga</p>
            {shelf(["<b>A Silent Voice</b>", "<b>Takopi's Original Sin</b>", "<b>Goodnight Punpun</b>", "<b>Three Days of Happiness</b>",
                    "<b>Princess Tutu</b>", "<b>Code Geass</b>", "<b>Vagabond</b>", "<b>Monster</b>", "<b>Jujutsu Kaisen</b>", "<b>Medalist</b>",
                    "<b>Bungo Stray Dogs</b>", "<b>Steins;Gate</b>"])}
            <p class="k">(web) light novels</p>
            {shelf(["<b>Mother of Learning</b>", "<b>Lord of Mysteries</b>"])}"""),
        hob("guitar", "Guitar", f"""
            <p class="k">currently learning</p>
            {shelf(["<b>Let Her Go</b> &middot; Passenger", "<b>Stitches</b> &middot; Shawn Mendes"])}
            <p class="k">songs I can play</p>
            {shelf(["<b>Blackbird</b> &middot; The Beatles", "<b>Say Yes to Heaven</b> &middot; Lana Del Rey", "<b>Riptide</b> &middot; Vance Joy", "<b>Wonderwall</b> &middot; Oasis", "<b>Until I Found You</b> &middot; Stephen Sanchez", "<b>Apocalypse</b> &middot; Cigarettes After Sex", "<b>Hey There Delilah</b> &middot; Plain White T's", "<b>Count on Me</b> &middot; Bruno Mars"])}"""),
        hob("crochet", "Crochet", "<p>I crochet amigurumi. Currently learning stitches, and hoping to freehand dolls and design my own.</p>"),
        hob("figure-skating", "Figure skating", "<p>I used to figure skate, not competitively. I can do an axel.</p>"),
        hob("skateboarding", "Skateboarding"),
        hob("badminton", "Badminton"),
    ]
    body = panel("hobbies", "          <h2>hobbies</h2>\n          <ul class=\"hobs\">\n" + "\n".join(items) + "\n          </ul>", "violet")
    page("hobbies.html", "hobbies | Trevor Chen", body, "")


# ---------------------------------------------------------------- learning
def build_learning():
    def item(title, url=None, note=""):
        t = f'<a href="{url}">{title}</a>' if url else title
        return f'            <li><b>{t}</b>' + (f' <span>{note}</span>' if note else "") + "</li>"

    def sec(name, items, color=""):
        return panel(name, '          <ul class="reading">\n' + "\n".join(item(*i) for i in items) + "\n          </ul>", color)

    intro = panel("learning", """          <h2>learning</h2>
          <p class="lede">What I've worked through, and the roadmap I keep for learning modern AI engineering.</p>
          <p>I'm currently learning reinforcement learning, evals, operating systems and distributed computing. Gotta use Twitter/X to keep up, too.</p>""", "gold")
    taken = sec("courses and books", [
        ("CMU 15-410, Operating System Design and Implementation", None, ""),
        ("Stanford CS 149, Parallel Computing", None, ""),
        ("Hands-On Modern RL", "https://walkinglabs.github.io/hands-on-modern-rl/preface/introduction", "reinforcement learning, hands on"),
        ("Dive into Deep Learning", "https://d2l.ai/chapter_reinforcement-learning/value-iter.html", "the deep learning book, including its reinforcement learning chapters"),
    ], "pink")
    caltech = panel("caltech courses", """          <p class="k">machine learning and computer science</p>
          <ul class="reading">
            <li><b>CS/CNS/EE/IDS 155</b> Machine Learning &amp; Data Mining</li>
            <li><b>EE/CNS/CS 148 A and B</b> Deep Learning</li>
            <li><b>CS/CNS/EE/IDS 159</b> Advanced Topics in Machine Learning</li>
            <li><b>CS 179</b> GPU Programming</li>
          </ul>
          <p class="k">statistics, mathematics and economics</p>
          <ul class="reading">
            <li><b>ACM/EE/IDS 116</b> Introduction to Probability Models</li>
            <li><b>IDS/ACM/CS 157</b> Statistical Inference</li>
            <li><b>PS/Ec 172</b> Game Theory</li>
            <li><b>Ec 11</b> Introduction to Economics</li>
          </ul>
          <p class="k">this term</p>
          <ul class="reading">
            <li><b>ACM/IDS 104</b> Applied Linear Algebra</li>
            <li><b>Ma 108a</b> Classical Analysis</li>
            <li><b>Ma/CS 6a</b> Introduction to Discrete Mathematics</li>
          </ul>""", "cyan")
    s0 = sec("general intuition", [
        ("CS229", None, "ML fundamentals: convex optimization, deep neural networks, data"),
        ("Welch Labs", "https://www.youtube.com/@WelchLabs", "good for general intuition"),
    ])
    s1 = sec("1. canonical LLM understanding", [
        ("Karpathy, Neural Networks: Zero to Hero", "https://karpathy.ai/zero-to-hero.html", "the backbone series: backprop up to a full GPT and tokenizer from scratch"),
        ("Karpathy, Deep Dive into LLMs like ChatGPT", None, "pretrain, SFT, RLHF end to end"),
        ("3Blue1Brown, Deep Learning (ch. 5-7)", "https://www.3blue1brown.com/topics/neural-networks", "attention, visually"),
        ("The Illustrated Transformer / The Illustrated GPT-2", "https://jalammar.github.io/illustrated-transformer/", "Jay Alammar; the best static visual reference"),
        ("RoPE", "https://blog.eleuther.ai/rotary-embeddings/", "EleutherAI; the rotation intuition without the math grind"),
        ("Attention variants (MQA / GQA), in-context learning, chain-of-thought reasoning, scaling laws", None, ""),
        ("CS336", "https://stanford-cs336.github.io/spring2025/", "Stanford; LLM fundamentals plus systems, free on YouTube"),
    ], "cyan")
    s2 = sec("2. RL", [
        ("Nathan Lambert's post-training course and RLHF Book", "https://rlhfbook.com", "overview, reward models, rejection sampling, RL math and implementation, reasoning and inference-time scaling, RLVR, distillation. Built for LLM post-training."),
        ("Spinning Up in Deep RL", "https://spinningup.openai.com", "OpenAI; raw RL intuition, policy gradients, value functions"),
    ])
    s3 = sec("3. direction of the field", [
        ("Karpathy, Software Is Changing (Again)", None, "the Software 3.0 keynote at YC AI Startup School"),
        ("Ilya Sutskever's talks on scaling", None, "they age well for intuition"),
        ("Lilian Weng's blog", "https://lilianweng.github.io", "ahead of where the conversation ends up"),
        ("Dwarkesh Patel's podcast", "https://www.dwarkesh.com", "long interviews with researchers at labs"),
    ], "violet")
    s4 = sec("4. agents and modern LLMs", [
        ("Anthropic, Building Effective Agents", "https://www.anthropic.com/engineering/building-effective-agents", "workflows vs. agents, and when you need which"),
        ("12-Factor Agents", "https://github.com/humanlayer/12-factor-agents", "Dex Horthy; principles from teams that shipped production agents. Context engineering is the real skill."),
        ("Tool use", None, ""),
    ])
    s5 = sec("5. AI engineering practice", [
        ("Prompting docs from Anthropic and OpenAI, and the OpenAI Cookbook", None, "genuinely sufficient on their own"),
        ("Eugene Yan on evals and LLM-evaluators", "https://eugeneyan.com", "task-specific evals; validating LLM-as-judge against human labels"),
        ("Shreya Shankar", "https://www.shreya-shankar.com", "the research side of evals; the Three Gulfs framing; DocETL and EvalGen"),
    ], "pink")
    s6 = sec("6. practical basics", [
        ("The Invention of LoRA, by Edward Hu", None, "straight from LoRA's creator"),
        ("QLoRA", "https://magazine.sebastianraschka.com", "Sebastian Raschka's blog covers the quantization layer"),
        ("Defeating Nondeterminism in LLM Inference", "https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/", "Thinking Machines; kernels aren't batch-invariant, and batch size varies under load"),
        ("Prompt injection", "https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/", "Simon Willison; the lethal trifecta: untrusted content, private data, exfiltration"),
    ], "gold")
    s7 = sec("7. systems", [
        ("KV caching", None, "why it exists; memory grows with sequence length x layers x heads"),
        ("Mixture of Experts Explained", "https://huggingface.co/blog/moe", "Hugging Face; routing and load balancing"),
        ("Flash attention", None, "Umar Jamil's coding video, or Tri Dao's blog on why it's IO-aware rather than FLOPs-bound"),
        ("RAG and chunking", None, "Pinecone's chunking write-up; the skill is knowing when RAG is the wrong tool"),
        ("How to generate text", "https://huggingface.co/blog/how-to-generate", "Hugging Face; top-k, top-p, temperature, and why greedy decoding degenerates"),
        ("Policy drift and designing evals", None, "why the eval harness has to run continuously, not just before launch"),
        ("The Ultra-Scale Playbook", "https://huggingface.co/spaces/nanotron/ultrascale-playbook", "Hugging Face; data, tensor and pipeline parallelism, all-reduce, bandwidth bottlenecks"),
        ("Inside vLLM", "https://blog.vllm.ai", "PagedAttention and continuous batching"),
    ], "cyan")
    s8 = sec("8. blogs and channels worth following", [
        ("Thinking Machines Lab", "https://thinkingmachines.ai/blog/", "every post a real systems-intuition deep dive"),
        ("Sebastian Raschka, Ahead of AI", "https://magazine.sebastianraschka.com", "consistent and technical"),
        ("vLLM blog, LMSYS and SGLang blogs", "https://blog.vllm.ai", "serving lessons as they're learned"),
        ("Anthropic engineering blog and OpenAI's blog", None, "primary sources from the labs"),
        ("Chip Huyen", "https://huyenchip.com/blog/", "production and evals"),
        ("Hamel Husain", "https://hamel.dev", "evals specifically"),
        ("Jia-Bin Huang (YouTube)", "https://www.youtube.com/c/JiaBinHuang", "technical, and very good for research ideas"),
        ("AI Explained (YouTube)", "https://www.youtube.com/@aiexplained-official", "AI news"),
    ], "violet")
    page("learning.html", "learning | Trevor Chen", "\n\n".join([intro, taken, caltech, s0, s1, s2, s3, s4, s5, s6, s7, s8]), "learning.html")


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
    build_learning()
    exp = ROOT / "explorer_page.py"
    if exp.exists():
        import importlib.util
        spec = importlib.util.spec_from_file_location("explorer_page", exp)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.build(page, panel)
    print("built", len(list(OUT.rglob("*.html"))), "pages")
