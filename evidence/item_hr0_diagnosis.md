# Item-CF zero-HR diagnostic — frozen split, no tuning

Same byte-identical Stage 4 split: 942 eligible users, 99,058 TRAIN observations. No holdout was rebuilt or reseeded.

Every held-out target is present in its user's candidate universe and has a computable Item-CF score: **942/942**. There are no missing scores, zero-denominator targets or missing-score reasons.

Full ranks after endpoint normalization:

| Statistic | Value |
|---|---:|
| Minimum | 74 |
| Q1 | 641.25 |
| Median | 802.5 |
| Q3 | 966.75 |
| Maximum | 1499 |

Target hits in Top-5/10/20/50/100: **0 / 0 / 0 / 0 / 2**.

Top-10/20/50/100 are post-hoc diagnostics only, not preregistered primary metrics or tuning objectives.

No Item-CF/evaluation algorithm error was found. Targets are scored but ranked well below 5; even the highest is rank 74. Therefore HR@5 = 0 is a real negative result of this frozen protocol, not absent-candidate or absent-score bookkeeping. No universal recommendation-quality claim follows.
