# Macroinvertebrate CV on Modal

Uses [Genius-Society/insecta](https://huggingface.co/Genius-Society/insecta) via
[quarrying-insect-id](https://github.com/quarrying/quarrying-insect-id) (detector + identifier ONNX).

## Prerequisites

- `pip install modal` (or `python3 -m modal`)
- Modal token: root `.env` with `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET`, or `modal token set`

## One-off test (no deploy)

From repo root:

```bash
python3 -m modal run modal/insecta.py --image-path web/public/media/thumbs/kick-sampling-tray-still.jpg
```

HF examples (insect-focused):

```bash
python3 -m modal run modal/insecta.py \
  --image-path /tmp/insecta-test/examples/beetle.jpg
```

Download HF examples first:

```bash
huggingface-cli download Genius-Society/insecta examples/beetle.jpg --local-dir /tmp/insecta-test
```

## KiEco mapping (demo)

All 2037 insecta classes map to a **KiEco family** + optional `hint` for the upload UI:

```bash
python3 scripts/build_insecta_kieco_map.py   # regen data/insecta_kieco_map.json
```

Exact catalog hits are rare; most trays use `order_hint` or `morphology_guess` (e.g. misread “Scorpiones” → **Leuctridae** with explanatory copy).

## Vendor tree (Python only)

```bash
git clone --filter=blob:none https://github.com/quarrying/quarrying-insect-id.git modal/vendor/quarrying-insect-id
# ONNX is downloaded from Hugging Face at container start — do not rely on LFS files in vendor/.
```

## Deploy (for Render to call later)

```bash
python3 -m modal deploy modal/insecta.py
```

App name: `macroinvertebrate-insecta`, class `InsectaModel`, method `infer`.  
**Default compute:** **16 CPU cores**, 16 GiB RAM, `onnxruntime` CPU EP (set `DEMO_GPU = "L4"` in `insecta.py` to try GPU again). First container start downloads ~50MB of ONNX from HF.

## Log noise (usually safe to ignore)

| Message | Meaning |
| ------- | ------- |
| CUDA / `libcublasLt` | Only if `DEMO_GPU` is set: ORT may fall back to CPU. CPU-only deploy uses plain `onnxruntime`. |
| PyTorch not installed | khandy optional import — ignore. |
| HF unauthenticated | Optional `HF_TOKEN` on Modal for faster HF downloads. |
| `crop_or_pad` deprecated | Upstream quarrying warning — ignore. |

## Env note

If `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` are set in the shell, they override `~/.modal.toml`.
That is fine when they match.