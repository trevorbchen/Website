"""Builds explorer.html. Called from build.py. Real GPT-2 activations are embedded as JSON."""
import json
import pathlib

DATA = pathlib.Path(__file__).parent / "explorer" / "data.json"


def build(page, panel):
    if not DATA.exists():
        print("explorer: data.json missing, run python3 explorer/precompute.py")
        return
    data = DATA.read_text(encoding="utf-8").replace("</", "<\\/")
    intro = panel("interpretability explorer", """          <h2>interpretability explorer</h2>
          <p class="small">Real activations from GPT-2 small (124M parameters), computed with PyTorch: what a token attends to in each of the 144 heads, how large its residual stream gets, and what the model would predict if you stopped reading after each layer (the <b>logit lens</b>). Everything is precomputed on these prompts. For your own, run <code>python3 explorer/precompute.py "your prompt"</code> and rebuild.</p>
          <div class="xp-prompts" id="xp-prompts"></div>
          <p class="small">Worth trying: on <b>Indirect object</b>, click the last token and pick head <b>9.6</b>. It reads from <b>"Mary"</b>, the answer. On <b>Induction</b>, head <b>5.5</b> puts 98% of its attention on <b>"Dave"</b>, the token that followed the previous "Carol", and the model predicts it.</p>
          <p class="xp-label">1. click a token (the query)</p>
          <div class="xp-tokens" id="xp-tokens"></div>
          <p class="xp-attn" id="xp-attn"></p>
          <div class="xp-row">
            <div>
              <p class="xp-label">2. its attention in all heads: rows are layers 0 to 11, columns are heads 0 to 11. Click a cell.</p>
              <canvas id="xp-grid" aria-label="Attention of the selected token across all layers and heads"></canvas>
              <p class="xp-hud" id="xp-hud"></p>
            </div>
            <div>
              <p class="xp-label" id="xp-head-label">3. the chosen head, all queries</p>
              <canvas id="xp-head" aria-label="Full attention matrix of the selected head"></canvas>
            </div>
          </div>""", "violet")
    lens = panel("inside the residual stream", """          <div class="xp-row">
            <div>
              <p class="xp-label">4. size of the selected token's residual stream after each layer (log scale; faint lines are the other tokens)</p>
              <canvas id="xp-norm" aria-label="Residual stream norm across layers"></canvas>
            </div>
            <div>
              <p class="xp-label">5. final prediction for the selected token</p>
              <div id="xp-final"></div>
            </div>
          </div>
          <p class="xp-label">6. logit lens: the model's best guess for the next token if you read out after each layer</p>
          <div id="xp-lens" class="xp-lens"></div>
          <p class="small">Early layers mostly echo the current token. The right answer tends to appear in the middle or late layers and then sharpen.</p>""", "cyan")
    body = "\n\n".join([intro, lens]) + f'\n      <script id="xp-data" type="application/json">{data}</script>'
    page("explorer.html", "interpretability explorer | Trevor Chen", body, "", extra_js=("explorer.js",))
