# Final Stage 4.1 validation outcome

The final application was validated after the post-implementation numerical correction.

- 29/29 unit tests passed.
- 16/16 browser regression assertions passed.
- 20/20 Python↔JavaScript full Top-5 comparisons passed.
- 942/942 held-out target JavaScript score/support checks passed.
- Frozen quality split, Part 2d selection and benchmark protocol remained unchanged.
- Production User 1 Top-5 lists remained unchanged.
- Part 2d Item-CF changed only because mathematically equal endpoint scores now tie correctly before the numeric-ID tie-break.
- User-CF final HR@5: 1.380% (13/942).
- Item-CF final HR@5: 0%; diagnosis found all 942 targets were valid candidates and received scores.
- TRAIN-popularity final HR@5: 10.510% (99/942).
- Final 10-user workload medians: User-CF 44.1 ms, Item-CF 7084.5 ms.

The runtime difference between development stages is not attributed to the tiny endpoint patch.

Final production hashes are pinned in `production_hashes_after.json`.
