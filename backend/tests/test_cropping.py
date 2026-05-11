"""Unit tests for cropping.py — all six rejection cases plus valid crop."""

import io

from PIL import Image

from app.cropping import crop_region
from app.schemas import BoundingBox


def _make_test_image(width: int = 500, height: int = 500) -> bytes:
    """Create a solid-color test image as raw bytes."""
    img = Image.new("RGB", (width, height), color=(200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


_IMG = _make_test_image()
_IMG_SIZE = (500, 500)


# ---------------------------------------------------------------------------
# Valid crop
# ---------------------------------------------------------------------------


def test_valid_bbox_returns_data_url() -> None:
    result = crop_region(_IMG, BoundingBox(x=100, y=100, width=200, height=200), _IMG_SIZE)
    assert result is not None
    assert result.startswith("data:image/png;base64,")


def test_valid_crop_is_decodable_png() -> None:
    """The returned base64 string decodes to a valid PNG image."""
    import base64

    result = crop_region(_IMG, BoundingBox(x=100, y=100, width=200, height=200), _IMG_SIZE)
    assert result is not None
    b64_data = result.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_data)
    img = Image.open(io.BytesIO(img_bytes))
    assert img.format == "PNG"


def test_valid_crop_includes_padding() -> None:
    """The crop should be larger than the raw bbox due to 10% padding."""
    import base64

    bbox = BoundingBox(x=100, y=100, width=200, height=200)
    result = crop_region(_IMG, bbox, _IMG_SIZE)
    assert result is not None
    b64_data = result.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(b64_data)))
    # 200 + 10% each side = 240 (padding is 20px each side)
    assert img.width > bbox.width
    assert img.height > bbox.height


# ---------------------------------------------------------------------------
# Rejection case 1: bbox is None
# ---------------------------------------------------------------------------


def test_none_bbox_returns_none() -> None:
    assert crop_region(_IMG, None, _IMG_SIZE) is None


# ---------------------------------------------------------------------------
# Rejection case 2: zero/negative dimensions
# ---------------------------------------------------------------------------


def test_zero_width_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=50, y=50, width=0, height=100), _IMG_SIZE) is None


def test_zero_height_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=50, y=50, width=100, height=0), _IMG_SIZE) is None


def test_negative_width_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=50, y=50, width=-10, height=100), _IMG_SIZE) is None


def test_negative_height_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=50, y=50, width=100, height=-10), _IMG_SIZE) is None


# ---------------------------------------------------------------------------
# Rejection case 3: entirely outside image bounds
# ---------------------------------------------------------------------------


def test_bbox_entirely_right_of_image_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=600, y=100, width=100, height=100), _IMG_SIZE) is None


def test_bbox_entirely_below_image_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=100, y=600, width=100, height=100), _IMG_SIZE) is None


def test_bbox_entirely_above_image_returns_none() -> None:
    """Negative x+width means the box ends before the image starts."""
    assert crop_region(_IMG, BoundingBox(x=-200, y=100, width=100, height=100), _IMG_SIZE) is None


def test_bbox_entirely_left_of_image_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=100, y=-200, width=100, height=100), _IMG_SIZE) is None


# ---------------------------------------------------------------------------
# Rejection case 4: too small (< 20x20)
# ---------------------------------------------------------------------------


def test_tiny_bbox_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=100, y=100, width=10, height=10), _IMG_SIZE) is None


def test_tiny_width_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=100, y=100, width=15, height=100), _IMG_SIZE) is None


def test_tiny_height_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=100, y=100, width=100, height=15), _IMG_SIZE) is None


# ---------------------------------------------------------------------------
# Rejection case 5: covers >90% of image (model "gave up")
# ---------------------------------------------------------------------------


def test_near_full_image_bbox_returns_none() -> None:
    """A bbox covering >90% of the image is rejected as a model cop-out."""
    # 480x480 = 230,400 out of 250,000 total = 92.2%
    assert crop_region(_IMG, BoundingBox(x=10, y=10, width=480, height=480), _IMG_SIZE) is None


# ---------------------------------------------------------------------------
# Rejection case 6: all-zero coordinates
# ---------------------------------------------------------------------------


def test_all_zero_bbox_returns_none() -> None:
    assert crop_region(_IMG, BoundingBox(x=0, y=0, width=0, height=0), _IMG_SIZE) is None


# ---------------------------------------------------------------------------
# Edge cases — partial overlap (should clamp and succeed)
# ---------------------------------------------------------------------------


def test_bbox_partially_outside_right_clamps_and_crops() -> None:
    """A bbox that extends past the right edge should be clamped, not rejected."""
    result = crop_region(_IMG, BoundingBox(x=400, y=100, width=200, height=100), _IMG_SIZE)
    assert result is not None


def test_bbox_partially_outside_bottom_clamps_and_crops() -> None:
    result = crop_region(_IMG, BoundingBox(x=100, y=400, width=100, height=200), _IMG_SIZE)
    assert result is not None


def test_bbox_with_negative_x_clamps_and_crops() -> None:
    """A bbox starting before the image edge should be clamped to x=0."""
    result = crop_region(_IMG, BoundingBox(x=-50, y=100, width=200, height=100), _IMG_SIZE)
    assert result is not None


def test_deliberately_bad_bbox_does_not_raise() -> None:
    """PRD acceptance criterion: {x: -50, y: -50, width: 10, height: 10} must not raise."""
    result = crop_region(_IMG, BoundingBox(x=-50, y=-50, width=10, height=10), _IMG_SIZE)
    # This is < 20x20, so it's rejected — but no exception.
    assert result is None
