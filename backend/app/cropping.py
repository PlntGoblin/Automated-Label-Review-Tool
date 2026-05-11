"""Image cropping for region overlays.

Extracts a subregion from the label image based on bounding boxes returned
by the vision model. Coordinates are treated as untrusted — all validation
rejects silently (returns None) rather than raising.
"""

import base64
import io
import logging

from PIL import Image

from app.schemas import BoundingBox

logger = logging.getLogger(__name__)

_DATA_URL_PREFIX = "data:image/png;base64,"

# Reject bboxes smaller than this — likely garbage coordinates from the VLM.
_MIN_DIMENSION = 20

# Reject bboxes covering more than this fraction of the image — the model
# probably "gave up" and returned a near-full-image box.
_MAX_AREA_FRACTION = 0.9

# Padding added on each side for visual context, as a fraction of the bbox dimension.
# 20% gives enough buffer that slightly inaccurate model bboxes still capture the full text.
_PAD_FRACTION = 0.20


def crop_region(
    image_bytes: bytes,
    bbox: BoundingBox | None,
    image_size: tuple[int, int],
) -> str | None:
    """Crop a region from the label image and return a base64 data-URL PNG.

    Returns None (never raises) when the bbox is missing, invalid, or unusable.
    The caller sets region_crop=None and the frontend shows a placeholder.
    """
    if bbox is None:
        return None

    img_w, img_h = image_size

    # Reject zero/negative dimensions.
    if bbox.width <= 0 or bbox.height <= 0:
        return None

    # Reject bbox entirely outside the image.
    if bbox.x >= img_w or bbox.y >= img_h:
        return None
    if bbox.x + bbox.width <= 0 or bbox.y + bbox.height <= 0:
        return None

    # Reject tiny bboxes (likely garbage coordinates).
    if bbox.width < _MIN_DIMENSION or bbox.height < _MIN_DIMENSION:
        return None

    # Reject bboxes covering >90% of the image (model "gave up").
    if (bbox.width * bbox.height) > _MAX_AREA_FRACTION * (img_w * img_h):
        return None

    # Reject all-zero coordinates.
    if bbox.x == 0 and bbox.y == 0 and bbox.width == 0 and bbox.height == 0:
        return None  # already caught by width/height <= 0, but explicit for clarity

    # Clamp to image bounds.
    x1 = max(bbox.x, 0)
    y1 = max(bbox.y, 0)
    x2 = min(bbox.x + bbox.width, img_w)
    y2 = min(bbox.y + bbox.height, img_h)

    # Apply 10% padding on each side, clamped to image bounds.
    pad_x = int((x2 - x1) * _PAD_FRACTION)
    pad_y = int((y2 - y1) * _PAD_FRACTION)
    x1 = max(x1 - pad_x, 0)
    y1 = max(y1 - pad_y, 0)
    x2 = min(x2 + pad_x, img_w)
    y2 = min(y2 + pad_y, img_h)

    try:
        img = Image.open(io.BytesIO(image_bytes))
        cropped = img.crop((x1, y1, x2, y2))
        buf = io.BytesIO()
        cropped.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"{_DATA_URL_PREFIX}{b64}"
    except Exception:
        logger.warning("crop_region failed for bbox %s", bbox, exc_info=True)
        return None
