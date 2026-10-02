🚀 **Live app:** https://ktmasteratwork.github.io/recsys_a03/

# A03 — Collaborative Filtering on MovieLens 100K

Week 3 homework for the HSE recommender-systems course. The application compares **User-Based CF** and **Item-Based CF** side by side for the same active MovieLens user.

## What the app does

- loads the unchanged MovieLens 100K snapshot: 943 users, 1,682 movies, 100,000 ratings;
- uses **co-rated-only cosine similarity** for missing data;
- User-CF selects the global Top-20 positive-similarity neighbours and predicts unseen ratings with a normalized similarity-weighted average;
- Item-CF compares unseen candidates with every positively similar movie in the active user's rated history and uses the same normalized weighted-average form;
- sorts by full-precision predicted score, then by numeric movie ID;
- displays Top-5 lists for both methods.

## Final implementation fixes

The starter was audited before implementation. The final version fixes the seven confirmed starter defects:

1. **D1 — genre shift:** all 19 `u.item` flags are aligned (`unknown` through `Western`).
2. **D2 — inconsistent load failure:** both recommendation panels now enter the same error/loading state.
3. **D3 — repeated/partial load duplication:** data is parsed locally and published atomically; repeated and concurrent loads remain canonical.
4. **D4 — damaged non-UTF-8 titles:** `u.item` is decoded explicitly as Windows-1252 for this observed snapshot.
5. **D5 — hidden error colour:** CSS specificity is corrected.
6. **D6 — missing result context:** each non-empty list explains what its scores mean.
7. **D7 — misleading empty state:** genuine no-evidence cases no longer display the starter TODO message.

A post-implementation numerical issue was also preserved and fixed transparently: a mathematically exact rating of 5 could become `5.000000000000001` in binary floating-point arithmetic and alter tie ordering. Scores within `1e-12` of the mathematical endpoints are normalized to exactly 1 or 5 **before ranking**; material out-of-range values still throw.

## Final validation snapshot

| Check | Final result |
|---|---:|
| Unit tests | 29 / 29 |
| Browser regression assertions | 16 / 16 |
| Python ↔ JavaScript Top-5 comparisons | 20 / 20 |
| Held-out target JS score/support checks | 942 / 942 |
| User-CF HR@5 | 1.380% (13 / 942) |
| Item-CF HR@5 | 0% (0 / 942) |
| TRAIN-popularity HR@5 | 10.510% (99 / 942) |
| User-CF 10-user workload median | 44.1 ms |
| Item-CF 10-user workload median | 7084.5 ms |

The Item-CF `HR@5 = 0` was diagnosed rather than tuned away: all 942 held-out targets were valid candidates and all received scores; their best full rank was 74 and median rank was 802.5. See `evidence/item_hr0_diagnosis.md`.

## Week 2 vs Week 3 controlled comparison

The comparison scenario was fixed before reading outputs: User 1 and five positive ratings (movies 168, 172, 165, 156, 166). The final Top-5 lists from Week 2 Content-Based, Week 3 User-CF and Week 3 Item-CF have zero pairwise overlap in this controlled case. This shows that the methods use different signals; it is not a universal quality ranking.

## Repository structure

```text
recsys_a03/
├── index.html
├── style.css
├── data.js
├── script.js
├── u.item
├── u.data
├── starter_spec.md
├── evidence/
│   ├── README.md
│   ├── validation_outcome.md
│   ├── before_after_summary.json
│   ├── unit_test_results.json
│   ├── browser_regression_results.json
│   ├── quality_protocol_frozen.json
│   ├── quality_summary.json
│   ├── item_hr0_diagnosis.md
│   ├── part2d_selection_frozen.json
│   ├── part2d_results.json
│   ├── numerical_issue_and_fix.md
│   ├── runtime_protocol_frozen.json
│   ├── runtime_summary.json
│   ├── production_hashes_after.json
│   ├── integrity_checks.json
│   └── recommendation_trace_examples.json
├── LICENSE
└── README.md
```

## Reproduce locally

Serve the repository over HTTP because the application fetches the two MovieLens data files:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Evidence notes

- `production_hashes_after.json` pins the exact final application and dataset bytes.
- `quality_protocol_frozen.json`, `runtime_protocol_frozen.json` and `part2d_selection_frozen.json` preserve choices made before the corresponding outputs were inspected.
- `before_after_summary.json` preserves the numerical-fix before/after result.
- `unit_test_results.json` and `browser_regression_results.json` contain the final automated checks.
- `item_hr0_diagnosis.md` documents why Item-CF's zero HR@5 is a genuine result of the frozen protocol rather than a missing-score bug.
- `recommendation_trace_examples.json` contains compact trace values used in the student's manual score checks.

The native OpenCode session log and final course-submission PDF are submission artifacts and are intentionally not duplicated in this public repository.

## Data and starter provenance

Starter and dataset: `dryjins/RecSys-LLMs`, Week 3, pinned commit `c00cfa1977dbeeb2155d3b70280cb9b382a24865`. The MovieLens files are kept byte-identical to the validated snapshot.

## Author

Ekaterina Zueva — HSE University
