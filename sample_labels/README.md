# Sample Labels

Use these files to test both the single-label and batch verification workflows.

## Included label: H. Deringer Bourbon

`h_deringer_front.jpg` and `h_deringer_back.jpg` are a real front/back label pair for H. Deringer Kentucky Straight Bourbon Whiskey.

**Single-label workflow:** Drop both images into the upload zone, then drop `h_deringer.json` to auto-fill the application form. The system will process both images together as one product.

**Batch workflow (Manual Entry):** In Batch Upload → Manual Entry, drop both images into Product 1's image zone and fill in the form manually.

**Batch workflow (CSV):** `batch_sample.csv` maps `h_deringer_front.jpg` to the application data. Upload `h_deringer_front.jpg` and the CSV together.

## Included label: Ducks Unlimited Bourbon

`ducks_unlimited_front.jpg` and `ducks_unlimited_back.jpg` are a real front/back label pair for Ducks Unlimited Kentucky Straight Bourbon Whiskey (World Whiskey Society, Limited Edition).

Use the same workflows as above. `ducks_unlimited.json` auto-fills the application form for the single-label flow. Both products are included in `batch_sample.csv`.

## How to run a batch demo

1. Open the app and click **Batch Upload**
2. Upload your label images (JPEG, PNG, or PDF)
3. Upload `batch_sample.csv` as the application data
4. Each image filename must match the `filename` column in the CSV exactly
5. Click **Verify Batch**

## CSV format

| Column | Description |
|--------|-------------|
| `filename` | Must match the uploaded image filename exactly |
| `brand_name` | Brand name as it appears on the COLA application |
| `class_or_type` | e.g. Tennessee Whiskey, Vodka, Beer |
| `alcohol_content` | e.g. 40% Alc./Vol. (80 Proof) |
| `net_contents` | e.g. 750 mL, 355 mL, 12 fl oz |
| `bottler_name_and_address` | Full bottler name and address |
| `country_of_origin` | e.g. United States, Mexico |

## Generating test label images

AI image generation tools work well for creating sample labels. Prompt example:

> "A realistic alcohol beverage label for [Brand Name], a [Class/Type]. Include brand name, class/type designation, alcohol content (40% Alc./Vol.), net contents (750 mL), bottler address, country of origin, and the full US Government Warning statement."
