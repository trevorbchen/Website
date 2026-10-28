"""Run GPT-2 small on a few prompts and dump real activations for the explorer.

    python3 explorer/precompute.py                      # the built-in prompts
    python3 explorer/precompute.py "your own prompt"    # add a prompt of your own

Writes explorer/data.json: tokens, attention [layer][head][query][key], residual-stream
norms per layer, and logit-lens top-5 predictions at every layer and position.
"""
import json
import pathlib
import sys

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

PROMPTS = [
    ("Indirect object", "When Mary and John went to the store, John gave a drink to"),
    ("Induction", "Alice Bob Carol Dave Alice Bob Carol"),
    ("Facts", "The Eiffel Tower is located in the city of"),
    ("Pattern", "The capital of France is Paris. The capital of Japan is"),
    ("Code", "def add(a, b):\n    return a +"),
    ("Diffusion", "Diffusion models learn to reverse a noising process. The reverse process"),
]
OUT = pathlib.Path(__file__).parent / "data.json"

tok = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2", attn_implementation="eager").eval()
blocks = model.transformer.h
prompts = PROMPTS + [(f"Custom {i + 1}", p) for i, p in enumerate(sys.argv[1:])]


def run(text):
    ids = tok(text, return_tensors="pt").input_ids
    states = []
    hooks = []

    def pre(m, args, kwargs):
        x = args[0] if args else kwargs["hidden_states"]
        states.append(x[0].detach())

    hooks.append(blocks[0].register_forward_pre_hook(pre, with_kwargs=True))
    for b in blocks:
        hooks.append(b.register_forward_hook(lambda m, a, o: states.append((o[0] if isinstance(o, tuple) else o)[0].detach())))
    with torch.no_grad():
        out = model(ids, output_attentions=True)
    for h in hooks:
        h.remove()
    assert len(states) == 13, len(states)
    toks = [tok.decode([i]) for i in ids[0]]
    attn = [[[[round(float(v), 3) for v in row] for row in head] for head in layer[0]] for layer in out.attentions]
    norms = [[round(float(s[t].norm()), 2) for s in states] for t in range(len(toks))]
    lens = []
    with torch.no_grad():
        for t in range(len(toks)):
            per_layer = []
            for s in states:
                logits = model.lm_head(model.transformer.ln_f(s[t]))
                p = torch.softmax(logits, -1)
                top = torch.topk(p, 5)
                per_layer.append([[tok.decode([int(i)]), round(float(v), 4)] for v, i in zip(top.values, top.indices)])
            lens.append(per_layer)
    return {"tokens": toks, "attn": attn, "norms": norms, "lens": lens}


data = {"model": "gpt2 (124M)", "layers": 12, "heads": 12, "prompts": []}
for name, text in prompts:
    print("running:", name, flush=True)
    data["prompts"].append({"name": name, "text": text, **run(text)})
OUT.write_text(json.dumps(data, separators=(",", ":")))
print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB")
