"""
Patch: Add challenge_pass_rate to master student data CSV

Run this ONCE in the same folder as your files.
Then re-run dumb_ways_analysis.py — the 80% pass rate analysis will activate.

What this adds to the CSV:
    challenge_total_correct — rounds answered correctly in challenge mode
    challenge_pass_rate     — % of rounds correct (0–100)
    challenge_passed_80     — 1 if pass rate >= 80%, else 0
"""

import json
import pandas as pd
import numpy as np

# ── Load ──────────────────────────────────────────────────────────────────────

master = pd.read_csv("master_student_data.csv")
with open("sessions.json") as f:
    all_sessions = json.load(f)

print(f"Master rows:     {len(master)}")
print(f"Session records: {len(all_sessions)}")

# ── Drop old columns if they already exist ───────────────────────────────────

for col in ["challenge_total_correct", "challenge_pass_rate", "challenge_passed_80"]:
    if col in master.columns:
        master = master.drop(columns=[col])

# ── Build a game_score → pass_rate lookup from sessions.json ─────────────────
# Since student names were removed from the master CSV, we join on game_score.
# session_df keeps only the best (highest score) run per student, same as your
# original notebook, so scores should be unique enough for a clean join.

score_records = []
for session_key, data in all_sessions.items():
    try:
        rounds  = data.get("challenge", {}).get("rounds", [])

        total   = len(rounds)
        # Firebase stores round outcomes as 'win': True/False
        correct = sum(1 for r in rounds if r.get("win", False) == True)
        score   = data.get("result", {}).get("finalScore", 0)

        score_records.append({
            "game_score":              score,
            "challenge_total_correct": correct,
            "challenge_pass_rate":     round(correct / total * 100, 1) if total > 0 else np.nan,
            "challenge_passed_80":     1 if total > 0 and (correct / total) >= 0.80 else 0,
        })
    except Exception:
        continue

score_df = (pd.DataFrame(score_records)
            .sort_values("game_score", ascending=False)
            .drop_duplicates("game_score")
            .reset_index(drop=True))

print(f"Unique scores parsed: {len(score_df)}")

# ── Merge on game_score ───────────────────────────────────────────────────────

patched = pd.merge(master, score_df, on="game_score", how="left")

# ── Report ────────────────────────────────────────────────────────────────────

matched   = patched["challenge_pass_rate"].notna().sum()
unmatched = patched["challenge_pass_rate"].isna().sum()
print(f"\nMatched rows:  {matched}")
print(f"Unmatched:     {unmatched}")

if matched > 0:
    print(f"\nChallenge pass rate summary:")
    print(f"  Mean:   {patched['challenge_pass_rate'].mean():.1f}%")
    print(f"  Median: {patched['challenge_pass_rate'].median():.1f}%")
    print(f"  Min:    {patched['challenge_pass_rate'].min():.1f}%")
    print(f"  Max:    {patched['challenge_pass_rate'].max():.1f}%")
    print(f"\n  Students who passed 80%+: {int(patched['challenge_passed_80'].sum())}")
    print(f"  Students below 80%:       {int((patched['challenge_passed_80'] == 0).sum())}")

# ── Save ──────────────────────────────────────────────────────────────────────

patched.to_csv("master_student_data.csv", index=False)
print("\n  Saved: master_student_data.csv (patched)")
print("  Now re-run: python dumb_ways_analysis.py")