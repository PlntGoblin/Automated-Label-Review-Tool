# Sample Labels

Use these files to test the batch verification workflow.

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
