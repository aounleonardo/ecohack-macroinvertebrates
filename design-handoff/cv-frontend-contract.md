# Computer vision: what the web frontend expects

For whoever builds the backend ↔ Modal link. The frontend is on `main` and works today with a precomputed demo result; this is the contract it needs from the live path.

## Request

`POST {VITE_API_URL}/api/inference` (in dev, Vite proxies `/api` to `127.0.0.1:8000`)

- `multipart/form-data`
- `file`: the tray photo as picked on the user's machine (JPG/PNG/HEIC, original size, may carry EXIF rotation)
- `site_id`: NRW site id, e.g. `K7b34c0ca`
- `Authorization: Bearer <token>` is sent only if the demo login was used; the frontend doesn't require auth.

Optional: set `VITE_INFER_URL` and the browser posts the same form straight to that URL (it must allow CORS).

## Response (JSON)

```json
{
  "detections": [
    { "family": "Heptageniidae", "confidence": 0.86, "bbox": [0.41, 0.38, 0.55, 0.67], "count": 1 }
  ],
  "bbox_format": "xyxy_normalized",
  "image_width": 1760,
  "image_height": 1200,
  "model": "Genius-Society/insecta"
}
```

- `family`: Latin family name as used in KiEco (`Baetidae`, not a genus or species). Names that don't match a known family still show, with an order silhouette, but can't unlock Dex cards.
- `confidence`: 0–1 (values over 1 are read as percentages). Under 0.70 shows a dashed box and a Yes/No check, and is not added to the Dex.
- `bbox`: preferred `[x1, y1, x2, y2]` normalised 0–1 to the image as the user sees it (after EXIF rotation). Also accepted: pixel `[x1, y1, x2, y2]` of the original image (send `image_width`/`image_height`), or `[x, y, w, h]` if `bbox_format` starts with `xywh`. `null` is fine: the result lists families without boxes.
- `count`: optional, default 1 (a VLM that counts but doesn't box can send one row per family).
- `match_kind`, `hint`, `pilot_suggestion` (from `modal/kieco_resolve.py`): anything other than `match_kind: "exact"`, or `pilot_suggestion: true`, is treated like low confidence: dashed box, "Is this right?" Yes/No, and kept out of the Dex until someone taps Yes. `hint` shows under the Latin name as "Model saw: …". `model_latin` and `class_id` are carried through but not shown.
- Also tolerated: `predictions` instead of `detections`; `label`/`class` for family; `score`/`conf` for confidence; `box` for bbox; `count_est`/`approximate_count` for count.

Note on `modal/insecta.py`: it resizes the long side to 1280 px before detecting, so `[x, y, w, h]` boxes are in that resized space. Normalise them (or send `image_width`/`image_height` of the resized image) so they land on the photo the user picked.

## Errors

Any non-2xx shows "We couldn’t identify this photo" with the response text, plus Try again / Choose another photo / Use the demo tray. Return a short, human-readable `detail`.

## Precomputed results (demo safety net)

Before calling the API the frontend looks for `web/public/data/inference/<sha256 of the file>.json`, then `<file name without extension>.json`, in the same response shape. `web/public/demo/darwinflow-demo-tray.jpg` has one, so it always gives a clean result offline.

## Opening any CV screen during the demo

- Gear menu on the map: Upload screen, Detection result (demo tray), Dex unlock moment, Coordinator review.
- Deep links: `?cv=upload`, `?cv=result`, `?cv=unlock`, `?cv=review` (add `&site=<id>`; default is Cwmpennar (upstream), a red site).
- In the app: site sidebar "Upload tray photo" / "Add a new sample here"; Coordinator view "Review".

Code: `web/src/lib/inference.ts` (client, normalisation, `isTentative`, `confirmFamily`), `components/UploadFlow.tsx`, `DetectionOverlay.tsx`, `UnlockModal.tsx`.
