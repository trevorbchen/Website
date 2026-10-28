"""Zero-ablate each attention head of GPT-2 small on a few prompts and record the effect on the
logit difference between the right answer and a plausible wrong one.

    python3 explorer/ablate.py        # writes explorer/ablate.json

A head's output is zeroed at every position, just before the attention output projection.
We also ablate the top-N heads (ranked by single-head importance) cumulatively.
"""
import json
import pathlib

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

TASKS = [
    ("Indirect object", "When Mary and John went to the store, John gave a drink to", " Mary", " John"),
    ("Induction", "Alice Bob Carol Dave Alice Bob Carol", " Dave", " Alice"),
    ("Pattern", "The capital of France is Paris. The capital of Japan is", " Tokyo", " Paris"),
]
OUT = pathlib.Path(__file__).parent / "ablate.json"
tok = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2", attn_implementation="eager").eval()
blocks = model.transformer.h
HD = 64


def run(ids, ablate):                      # ablate: set of (layer, head)
    hooks = []
    byl = {}
    for l, h in ablate:
        byl.setdefault(l, []).append(h)
    for l, hs in byl.items():
        def pre(m, args, hs=hs):
            x = args[0].clone()
            for h in hs:
                x[..., h * HD:(h + 1) * HD] = 0
            return (x,)
        hooks.append(blocks[l].attn.c_proj.register_forward_pre_hook(pre))
    with torch.no_grad():
        logits = model(ids).logits[0, -1]
    for h in hooks:
        h.remove()
    return logits


def summarize(logits, c, d):
    p = torch.softmax(logits, -1)
    top = torch.topk(p, 3)
    return {"ld": round(float(logits[c] - logits[d]), 3), "pc": round(float(p[c]), 4),
            "top": [[tok.decode([int(i)]), round(float(v), 3)] for v, i in zip(top.values, top.indices)]}


data = {"model": "gpt2 (124M)", "tasks": []}
for name, text, cor, dis in TASKS:
    ids = tok(text, return_tensors="pt").input_ids
    c, d = tok.encode(cor)[0], tok.encode(dis)[0]
    base = summarize(run(ids, set()), c, d)
    grid = [[summarize(run(ids, {(l, h)}), c, d) for h in range(12)] for l in range(12)]
    drops = sorted(((base["ld"] - grid[l][h]["ld"], l, h) for l in range(12) for h in range(12)), reverse=True)
    order = [[l, h] for _, l, h in drops[:12]]
    cum = [summarize(run(ids, {tuple(x) for x in order[:n]}), c, d) for n in range(0, 13)]
    print(name, "base ld", base["ld"], "| top heads", order[:5], "| cumulative ld", [x["ld"] for x in cum[:7]], flush=True)
    data["tasks"].append({"name": name, "text": text, "tokens": [tok.decode([i]) for i in ids[0]],
                          "correct": cor, "distractor": dis, "base": base, "grid": grid, "order": order, "cum": cum})
OUT.write_text(json.dumps(data, separators=(",", ":")))
print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB")
