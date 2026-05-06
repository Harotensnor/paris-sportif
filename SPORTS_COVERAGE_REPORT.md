# Sports Coverage Report

Generated: `2026-05-06T00:01:44Z`

## Summary

- Sports indexed: **11**
- Ready/bookable: **1**
- Watch/derived: **3**
- Missing source: **7**
- Bookable events observed locally: **19**

## Coverage Matrix

| Sport | Status | Bookable | Source watch | Derived markets | Target |
|---|---:|---:|---:|---:|---|
| 🏉 Rugby | Détecté, pas encore bookable | 0 | 2 | 0 | 50+ matches/jour pendant saison |
| 🤾 Handball | Source à brancher | 0 | 0 | 0 | 20+ matches/jour saison |
| 🏐 Volleyball | Source à brancher | 0 | 0 | 0 | 10+ matches/jour saison |
| 🎮 E-sports | Source à brancher | 0 | 0 | 0 | 20+ matches/jour |
| 🥊 Boxe / MMA | Bookable Winamax | 19 | 0 | 44 | Tous events UFC + grands events box |
| 🚴 Cyclisme | Source à brancher | 0 | 0 | 0 | Tour, Giro, Vuelta, classiques |
| 🎿 Sports d'hiver | Source à brancher | 0 | 0 | 0 | Weekends de course |
| 🏃 Athlétisme | Source à brancher | 0 | 0 | 0 | Grands events trackés |
| 🎾 Tennis Challenger / ITF | Détecté, pas encore bookable | 0 | 818 | 0 | 30+ matches/jour Challenger pendant saison |
| ⚽ Foot féminin | Détecté, pas encore bookable | 0 | 7 | 0 | Top-3 ligues féminines couvertes |
| 🏈 NFL playoffs | Source à brancher | 0 | 0 | 0 | Tous playoffs |

## Operational Notes

- No new pick is generated for watch-only sports until a Winamax-bookable event is present.
- Combat is currently the most actionable new family because Winamax catalog exposes UFC/MMA events.
- Tennis Challenger/ITF and women's football have source coverage, but remain non-actionable when absent from the Winamax exact feed.

## Next Technical Steps

- Add per-sport fetchers only for sports whose Winamax catalog exposes recurring bookable events.
- Keep these pages as coverage/status surfaces, not recommendation feeds, until markets are exact.
- Re-run `scripts/build_sports_coverage_extended.py` after each data refresh.

## Capture Artifacts

- `captures/sports-coverage-v37.015/sports-tous.png`
- `captures/sports-coverage-v37.015/rugby.png`
- `captures/sports-coverage-v37.015/handball.png`
- `captures/sports-coverage-v37.015/volley.png`
- `captures/sports-coverage-v37.015/esport.png`
- `captures/sports-coverage-v37.015/combat.png`
- `captures/sports-coverage-v37.015/cyclisme.png`
- `captures/sports-coverage-v37.015/ski.png`
- `captures/sports-coverage-v37.015/athle.png`
- `captures/sports-coverage-v37.015/tennis-challenger.png`
- `captures/sports-coverage-v37.015/foot-feminin.png`
- `captures/sports-coverage-v37.015/nfl.png`

## Ready Families

- 🥊 **Boxe / MMA**: 19 bookable events.

## Watch Families

- 🏉 **Rugby**: 2 source events, 0 derived markets.
- 🎾 **Tennis Challenger / ITF**: 818 source events, 0 derived markets.
- ⚽ **Foot féminin**: 7 source events, 0 derived markets.

## Missing Families

- 🤾 **Handball**: source connector pending.
- 🏐 **Volleyball**: source connector pending.
- 🎮 **E-sports**: source connector pending.
- 🚴 **Cyclisme**: source connector pending.
- 🎿 **Sports d'hiver**: source connector pending.
- 🏃 **Athlétisme**: source connector pending.
- 🏈 **NFL playoffs**: source connector pending.

