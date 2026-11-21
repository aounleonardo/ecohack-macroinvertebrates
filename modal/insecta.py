"""
Genius-Society/insecta on Modal (quarrying-insect-id detector + identifier).

Deploy:  python3 -m modal deploy modal/insecta.py
Test:     python3 -m modal run modal/insecta.py --image-path web/public/media/thumbs/kick-sampling-tray-still.jpg
"""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

import modal

REPO_ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = REPO_ROOT / "modal" / "vendor" / "quarrying-insect-id"
KIECO_MAP = REPO_ROOT / "data" / "insecta_kieco_map.json"
KIECO_RESOLVE = Path(__file__).resolve().parent / "kieco_resolve.py"
INSECTID_PKG = VENDOR_ROOT / "insectid"
REMOTE_PKG = "/root/quarrying-insect-id"
HF_REPO = "Genius-Society/insecta"
# ONNX on disk after HF pull (avoids Git LFS pointer stubs in vendor clones).
MIN_ONNX_BYTES = {
    "quarrying_insect_detector.onnx": 20_000_000,
    "quarrying_insect_identifier.onnx": 15_000_000,
    "quarrying_insectid_label_map.txt": 50_000,
}

APP_NAME = "macroinvertebrate-insecta"
# Modal still requires a card on file for GPU workers (credits apply). Use `L4` for demo speed.
DEMO_GPU = "L4"  # set to None for CPU-only (no card); Modal still needs a card on file for GPU
MIN_BOX = 30
ID_PROB_THRESH = 0.10
DET_CONF = 0.5
DET_IOU = 0.5

# Tray kick-samples: more boxes, slightly looser ID (pilot — expect taxonomy misses).
INFERENCE_PROFILES: dict[str, dict[str, float | int]] = {
    "kick_tray": {"det_conf": 0.35, "id_prob": 0.08, "min_box": 24},
    "underwater": {"det_conf": 0.45, "id_prob": 0.10, "min_box": 30},
    "default": {"det_conf": DET_CONF, "id_prob": ID_PROB_THRESH, "min_box": MIN_BOX},
}

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libglib2.0-0", "libgl1")
    .pip_install(
        "huggingface_hub>=0.26.0",
        "opencv-python-headless>=4.8.0",
        "khandy>=0.1.8",
        "numpy>=1.26.0",
        # Pin below latest: ORT 1.32 wants CUDA 13 libs; Modal L4 images are often CUDA 12.
        "onnxruntime-gpu==1.18.1",
    )
    .run_commands(
        f"mkdir -p {REMOTE_PKG}",
    )
    .add_local_dir(
        str(INSECTID_PKG),
        remote_path=f"{REMOTE_PKG}/insectid",
        copy=True,
    )
    .add_local_file(
        str(KIECO_MAP),
        remote_path="/root/data/insecta_kieco_map.json",
        copy=True,
    )
    .add_local_file(
        str(KIECO_RESOLVE),
        remote_path="/root/kieco_resolve.py",
        copy=True,
    )
)

app = modal.App(APP_NAME)


def _ensure_insecta_models() -> Path:
    """Pull real ONNX weights from Hugging Face (never trust vendor/LFS stubs)."""
    from huggingface_hub import hf_hub_download

    model_dir = Path(REMOTE_PKG) / "insectid" / "models"
    model_dir.mkdir(parents=True, exist_ok=True)
    for fname, min_bytes in MIN_ONNX_BYTES.items():
        dest = model_dir / fname
        needs_dl = not dest.is_file() or dest.stat().st_size < min_bytes
        if needs_dl:
            print(f"[insecta] Downloading {fname} from {HF_REPO} …", flush=True)
            src = Path(hf_hub_download(repo_id=HF_REPO, filename=fname))
            shutil.copy2(src, dest)
            print(f"[insecta] Wrote {dest} ({dest.stat().st_size} bytes)", flush=True)
    return model_dir


def _load_image_from_bytes(data: bytes):
    import khandy

    suffix = ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(data)
        tmp.flush()
        image = khandy.imread(tmp.name)
    if image is None:
        raise ValueError("Could not decode image bytes")
    if max(image.shape[:2]) > 1280:
        image = khandy.resize_image_long(image, 1280)
    return image


_cls_kw: dict = {
    "image": image,
    "memory": 8192,
    "timeout": 600,
    "scaledown_window": 300,
}
if DEMO_GPU:
    _cls_kw["gpu"] = DEMO_GPU
else:
    _cls_kw["cpu"] = 2.0


@app.cls(**_cls_kw)
class InsectaModel:
    @modal.enter()
    def setup(self) -> None:
        print("[insecta] Container setup starting …", flush=True)
        if REMOTE_PKG not in sys.path:
            sys.path.insert(0, REMOTE_PKG)
        _ensure_insecta_models()
        from insectid import InsectDetector, InsectIdentifier

        print("[insecta] Loading detector ONNX …", flush=True)
        self.detector = InsectDetector()
        print("[insecta] Loading identifier ONNX …", flush=True)
        self.identifier = InsectIdentifier()
        if "/root" not in sys.path:
            sys.path.insert(0, "/root")
        from kieco_resolve import KiecoResolver

        self.resolver = KiecoResolver()
        print("[insecta] Ready for inference.", flush=True)

    @modal.method()
    def infer(self, image_bytes: bytes, source: str = "kick_tray") -> dict:
        import khandy
        import numpy as np

        profile = INFERENCE_PROFILES.get(source, INFERENCE_PROFILES["default"])
        det_conf = float(profile["det_conf"])
        id_prob = float(profile["id_prob"])
        min_box = int(profile["min_box"])

        print(
            f"[insecta] infer: {len(image_bytes)} bytes, source={source!r}",
            flush=True,
        )
        image = _load_image_from_bytes(image_bytes)
        boxes, confs, _classes = self.detector.detect(
            image, conf_thresh=det_conf, iou_thresh=DET_IOU
        )
        print(f"[insecta] detector returned {len(boxes)} boxes", flush=True)

        detections: list[dict] = []
        for box, det_conf in zip(boxes, confs):
            box = box.astype(np.int32)
            bw, bh = box[2] - box[0], box[3] - box[1]
            if bw < min_box or bh < min_box:
                continue

            cropped = khandy.crop_or_pad(image, box[0], box[1], box[2], box[3])
            results = self.identifier.identify(cropped, topk=1)
            if not results:
                continue
            top = results[0]
            prob = float(top["probability"])
            if prob < id_prob:
                continue

            probs = self.identifier.predict(cropped)
            _tk_probs, tk_idx = khandy.top_k(probs, 1)
            class_id = int(tk_idx[0][0])

            latin = top.get("latin_name") or ""
            raw = {
                "confidence": round(prob, 4),
                "bbox": [
                    int(box[0]),
                    int(box[1]),
                    int(bw),
                    int(bh),
                ],
                "chinese_name": top.get("chinese_name"),
                "latin_name": latin,
                "detector_confidence": round(float(det_conf), 4),
                "class_id": class_id,
            }
            detections.append(
                self.resolver.apply_to_detection(raw, class_id=class_id)
            )

        print(f"[insecta] returning {len(detections)} detections", flush=True)
        return {
            "detections": detections,
            "model": "Genius-Society/insecta",
            "source": source,
            "pilot_classifier": True,
            "profile": profile,
        }


@app.local_entrypoint()
def main(image_path: str, source: str = "kick_tray") -> None:
    path = Path(image_path).expanduser().resolve()
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")

    data = path.read_bytes()
    print(f"Running insecta on {path} ({len(data)} bytes) …")
    print(
        "If this spinner sits idle, open the run URL above → Logs "
        "(first L4 start often 2–5 min: GPU + HF ONNX download).",
    )
    out = InsectaModel().infer.remote(data, source)
    print(json.dumps(out, indent=2, ensure_ascii=False))