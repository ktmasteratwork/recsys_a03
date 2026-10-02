# Endpoint roundoff discovered after Stage 4

The original controlled Part 2d result produced Item-CF values such as `5.000000000000001`.

All usable contributor ratings were 5, so mathematically the normalized weighted mean is exactly 5. Binary64 division overshot by (8.881784197001252e-16).

Minimal production patch:
- shared `normalizePredictedRating` is called by both predictors;
- normalization happens after numerator/denominator calculation and **before ranking**;
- values within absolute `1e-12` of 1 or 5 snap to that endpoint;
- non-finite or materially out-of-range values throw instead of being silently clamped;
- all other interior scores retain full precision.

N=20, co-rated cosine, contributor selection, prediction formulas, frozen split, seed and tie-break were unchanged.

Dedicated User-CF and Item-CF fixtures reproduce the overshoot and verify corrected tie ordering. Final unit suite: 29/29.
