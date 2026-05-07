"""
Dumb Ways to AI — Research Analysis Script
Organized by Research Question

Statistical tests used in this script:
─────────────────────────────────────────────────────────────────────────────
TEST                    WHERE USED              WHY
─────────────────────────────────────────────────────────────────────────────
Paired t-test           RQ1                     Compares the same students'
                                                pre vs post scores. Use when
                                                data is continuous or binary
                                                and samples are matched.

McNemar's Test          RQ1                     Compares binary outcomes
                                                (correct/incorrect) on the
                                                SAME students before and after.
                                                More appropriate than t-test
                                                for binary matched data.
                                                Gold standard for pre/post
                                                single-item studies.

Chi-Square Test         RQ2 (gameplay →         Tests whether two categorical
of Independence         mastery)                variables are related (e.g.,
                                                did playing more rounds make
                                                students more likely to get
                                                all questions correct?).
                                                Used when both variables are
                                                categorical (groups vs correct/
                                                incorrect).

Descriptive Statistics  RQ2 (accuracy           No inferential test — just
(counts + percentages)  table), RQ3             counts and percentages. Used
                        (attitude baseline)     when there is no pre-survey
                                                baseline to compare against.
                                                Appropriate for post-only
                                                measures.
─────────────────────────────────────────────────────────────────────────────

Requirements:
    pip install pandas scipy statsmodels matplotlib seaborn openpyxl

Usage:
    Place this script in the same folder as:
        - dumb_ways_to_ai_pre_survey.csv
        - dumb_ways_to_ai_post_survey.csv
        - sessions.json
        - cleaned_dumb_ways_to_ai_master.csv  (from your existing notebook)
    Then run: python dumb_ways_analysis.py
"""

import json
import pandas as pd
import numpy as np
from scipy.stats import chi2_contingency, ttest_rel
from statsmodels.stats.contingency_tables import mcnemar
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# CONFIGURATION — correct answers for each post-survey question
# ============================================================

# Map: short name -> (column keyword to find it, correct answer(s))
# For privacy, student must select BOTH correct options (not the wrong ones)
PRIVACY_CORRECT = {
    "Deleting user data when it is no longer needed",
    "Only requesting permissions the app needs to function",
    "Being clear about what data is collected and why"
}
PRIVACY_WRONG = {
    "Collecting extra data just in case it becomes useful later",
    "Sharing user data with partners without telling users"
}

CORRECT_ANSWERS = {
    "general":        ("NOT a principle of Responsible AI",  "Friendly"),
    "fairness":       ("Developer Doom",                      "The AI will unfairly favor students similar to those in its training data"),
    "accountability": ("autonomous vehicle",                  "The developer of the autonomous vehicle"),
    "transparency":   ("transparency builds user trust",      "Users can see how decisions are made, spot limitations, and challenge outcomes that seem wrong"),
    # privacy is multi-select — handled separately
}

UTSA_NAVY   = "#003366"
UTSA_ORANGE = "#F15A22"
GRAY        = "#888888"

sns.set_theme(style="whitegrid", font_scale=1.05)

# ============================================================
# STEP 1 — LOAD DATA
# ============================================================

print("=" * 60)
print("Loading data...")
print("=" * 60)

pre_df  = pd.read_csv("dumb_ways_to_ai_pre_survey.csv")
post_df = pd.read_csv("dumb_ways_to_ai_post_survey.csv")

with open("sessions.json", "r") as f:
    all_sessions = json.load(f)

print(f"  Pre-survey rows:  {len(pre_df)}")
print(f"  Post-survey rows: {len(post_df)}")
print(f"  Session records:  {len(all_sessions)}")

# ============================================================
# STEP 2 — PARSE FIREBASE SESSIONS
# ============================================================

def find_col(df, keyword):
    """Return first column name containing keyword (case-insensitive)."""
    matches = [c for c in df.columns if keyword.lower() in c.lower()]
    if not matches:
        raise ValueError(f"No column found containing: '{keyword}'")
    return matches[0]

session_records = []

for session_key, data in all_sessions.items():
    try:
        # Get player name
        if "player" in data and "name" in data["player"]:
            player_name = data["player"]["name"].strip().upper()
        else:
            parts = session_key.split("_")
            player_name = f"{parts[0]} {parts[1]}".upper()

        record = {"match_name": player_name}

        # --- Tutorial times ---
        tuts = data.get("tutorials", {})
        record["tut_fairness_ms"]       = tuts.get("fairness",       {}).get("durationMs", 0)
        record["tut_transparency_ms"]   = tuts.get("transparency",   {}).get("durationMs", 0)
        record["tut_accountability_ms"] = tuts.get("accountability", {}).get("durationMs", 0)
        record["tut_privacy_ms"]        = tuts.get("privacy",        {}).get("durationMs", 0)
        record["tut_total_ms"]          = sum([
            record["tut_fairness_ms"], record["tut_transparency_ms"],
            record["tut_accountability_ms"], record["tut_privacy_ms"]
        ])

        # --- Challenge mode ---
        challenge = data.get("challenge", {})
        record["highest_difficulty"]  = challenge.get("highestDifficultyReached", None)
        record["total_rounds"]        = challenge.get("roundsCompleted", 0)
        record["game_score"]          = data.get("result", {}).get("finalScore", 0)

        # --- Rounds breakdown ---
        rounds = challenge.get("rounds", [])
        fair_rounds = trans_rounds = acc_rounds = priv_rounds = 0
        fair_correct = trans_correct = acc_correct = priv_correct = 0
        total_correct = 0

        for r in rounds:
            mg = str(r.get("miniGame", "")).lower()
            correct = r.get("win", False)
            if correct:
                total_correct += 1
            if "fair" in mg:
                fair_rounds += 1
                if correct: fair_correct += 1
            elif "trans" in mg:
                trans_rounds += 1
                if correct: trans_correct += 1
            elif "acc" in mg:
                acc_rounds += 1
                if correct: acc_correct += 1
            elif "priv" in mg:
                priv_rounds += 1
                if correct: priv_correct += 1

        record["fair_rounds"]  = fair_rounds
        record["trans_rounds"] = trans_rounds
        record["acc_rounds"]   = acc_rounds
        record["priv_rounds"]  = priv_rounds

        # Challenge pass rate (% of rounds answered correctly)
        total = fair_rounds + trans_rounds + acc_rounds + priv_rounds
        record["challenge_total_rounds"]  = total
        record["challenge_total_correct"] = total_correct
        record["challenge_pass_rate"]     = (total_correct / total * 100) if total > 0 else np.nan
        record["challenge_passed_80"]     = 1 if (record["challenge_pass_rate"] is not np.nan
                                                   and record["challenge_pass_rate"] >= 80) else 0

        session_records.append(record)
    except Exception:
        continue

# Keep only best run per student
session_df = (pd.DataFrame(session_records)
              .sort_values("game_score", ascending=False)
              .drop_duplicates("match_name")
              .reset_index(drop=True))

print(f"  Sessions parsed:  {len(session_df)}")

# ============================================================
# STEP 3 — SCORE POST-SURVEY QUESTIONS
# ============================================================

def score_col(df, keyword, correct_answer):
    col = find_col(df, keyword)
    return col, df[col].str.strip().eq(correct_answer).astype(int)

def score_privacy(df):
    col = find_col(df, "respecting user privacy")
    def check(val):
        if pd.isna(val):
            return 0
        selected = set(s.strip() for s in str(val).split(","))
        # Must include at least 2 of the 3 correct options and NONE of the wrong ones
        has_wrong = bool(selected & PRIVACY_WRONG)
        correct_count = len(selected & PRIVACY_CORRECT)
        return 1 if (not has_wrong and correct_count >= 2) else 0
    return col, df[col].apply(check)

# Score all post-survey questions
col_gen,  post_df["s_general"]        = score_col(post_df, "NOT a principle", "Friendly")
col_fair, post_df["s_fairness"]       = score_col(post_df, "Developer Doom",  "The AI will unfairly favor students similar to those in its training data")
col_acc,  post_df["s_accountability"] = score_col(post_df, "autonomous vehicle", "The developer of the autonomous vehicle")
col_trans,post_df["s_transparency"]   = score_col(post_df, "transparency builds", "Users can see how decisions are made, spot limitations, and challenge outcomes that seem wrong")
col_priv, post_df["s_privacy"]        = score_privacy(post_df)

# Total score out of 5
score_cols = ["s_general", "s_fairness", "s_accountability", "s_transparency", "s_privacy"]
post_df["total_score"] = post_df[score_cols].sum(axis=1)
post_df["all_correct"] = (post_df["total_score"] == 5).astype(int)

# Score the matched pre-survey question
pre_col_gen = find_col(pre_df, "NOT a principle")
pre_df["s_general_pre"] = pre_df[pre_col_gen].str.strip().eq("Friendly").astype(int)

print("\nPost-survey scoring complete.")
print(f"  Rows scored: {len(post_df)}")

# ============================================================
# STEP 4 — MERGE EVERYTHING
# ============================================================

# Merge pre + post on Response ID
merged = pd.merge(
    pre_df[["Response ID", "s_general_pre",
            find_col(pre_df, "positively impact"),
            find_col(pre_df, "worried about bias"),
            find_col(pre_df, "excited about")]],
    post_df[["Response ID"] + score_cols + ["total_score", "all_correct"]],
    on="Response ID"
)

# We can't match to sessions by name (no names in anonymized file)
# Session data is analyzed separately where we have the name-matched master
print(f"\n  Merged survey rows: {len(merged)}")

# ============================================================
# STEP 5 — RQ1: Knowledge Gain (Pre → Post on General Question)
# ============================================================

print("\n" + "=" * 60)
print("RQ1: Knowledge Gain — Pre vs Post (General Question)")
print("=" * 60)

pre_scores  = merged["s_general_pre"]
post_scores = merged["s_general"]

pre_mean  = pre_scores.mean()
post_mean = post_scores.mean()

# PAIRED T-TEST
# Used because: the same 89 students answered this question in both surveys.
# Paired t-test accounts for this matched structure.
# Assumption: works on binary 0/1 scores when N is large enough (N=89 satisfies this).
t_stat, p_val = ttest_rel(pre_scores, post_scores)

# McNemar contingency
ct = pd.crosstab(
    pre_scores.map({1: "Correct", 0: "Incorrect"}),
    post_scores.map({1: "Correct", 0: "Incorrect"}),
    rownames=["Pre-Survey"],
    colnames=["Post-Survey"]
)
# MCNEMAR'S TEST
# Used because: we have binary outcomes (correct/incorrect) on the SAME students
# measured twice (pre and post). McNemar's is specifically designed for this:
# it only looks at the students who CHANGED their answer (the "discordant" pairs).
# More statistically appropriate than t-test for this binary matched-pair situation.
# exact=True is recommended for N < 200.
mcn_result = mcnemar(ct, exact=True)

# Extract groups
mcn_a = ct.loc["Correct",   "Correct"]   # both correct
mcn_b = ct.loc["Correct",   "Incorrect"] # confused (pre right, post wrong)
mcn_c = ct.loc["Incorrect", "Correct"]   # learners (pre wrong, post right)
mcn_d = ct.loc["Incorrect", "Incorrect"] # both wrong

print(f"\n  N = {len(merged)}")
print(f"  Pre-survey accuracy:  {pre_mean:.1%}")
print(f"  Post-survey accuracy: {post_mean:.1%}")
print(f"  Gain:                 +{post_mean - pre_mean:.1%}")
print(f"  Paired t-test p =     {p_val:.4f} {'***' if p_val < 0.001 else '**' if p_val < 0.01 else '*' if p_val < 0.05 else ''}")
print(f"\n  McNemar's Test p =    {mcn_result.pvalue:.4f}")
print(f"  Learners (wrong→right): {mcn_c}")
print(f"  Confused (right→wrong): {mcn_b}")
print(f"  Both correct:           {mcn_a}")
print(f"  Both wrong:             {mcn_d}")

# ---- Figure 1: Answer shift bar chart ----
pre_counts  = pre_df[pre_col_gen].value_counts().rename("Pre-Survey")
post_counts = post_df[col_gen].value_counts().rename("Post-Survey")
shift_df = pd.concat([pre_counts, post_counts], axis=1).fillna(0).astype(int)
shift_df.index.name = "Answer Choice"

fig, ax = plt.subplots(figsize=(10, 5))
shift_df.reset_index().melt(id_vars="Answer Choice", var_name="Survey", value_name="Count").pipe(
    lambda d: sns.barplot(data=d, x="Count", y="Answer Choice", hue="Survey",
                          palette=[UTSA_ORANGE, UTSA_NAVY], ax=ax)
)
ax.set_title("RQ1 — Shift in Student Answers: Which is NOT a Responsible AI Principle?", fontsize=13)
ax.set_xlabel("Number of Students")
ax.set_ylabel("")
for p in ax.patches:
    w = p.get_width()
    if w > 0:
        ax.annotate(f"{int(w)}", (w + 0.3, p.get_y() + p.get_height() / 2),
                    va="center", fontsize=9)
plt.tight_layout()
plt.savefig("fig1_rq1_answer_shift.png", dpi=150)
plt.close()
print("\n  Saved: fig1_rq1_answer_shift.png")

# ============================================================
# STEP 6 — RQ2: Per-Principle Accuracy Table (Post-Survey Only)
#
# STATISTICAL APPROACH: Descriptive statistics only (counts + %)
# Why no inferential test here? There is no pre-survey baseline for
# these questions, so we cannot claim "improvement." We can only
# describe the level of accuracy students demonstrated after playing.
# In your paper, frame as: "X% of students correctly identified..."
# ============================================================

print("\n" + "=" * 60)
print("RQ2: Per-Principle Post-Survey Accuracy")
print("=" * 60)

principles = {
    "General (NOT a Principle)": "s_general",
    "Fairness":                   "s_fairness",
    "Accountability":             "s_accountability",
    "Transparency":               "s_transparency",
    "Privacy (multi-select)":     "s_privacy",
}

accuracy_rows = []
for label, col in principles.items():
    n_correct = post_df[col].sum()
    n_total   = post_df[col].notna().sum()
    pct       = n_correct / n_total * 100
    accuracy_rows.append({
        "Principle":    label,
        "N Correct":    int(n_correct),
        "N Total":      int(n_total),
        "Accuracy (%)": round(pct, 1)
    })

accuracy_df = pd.DataFrame(accuracy_rows)
print("\n  Per-Principle Post-Survey Accuracy:")
print(accuracy_df.to_string(index=False))

n_all = post_df["all_correct"].sum()
print(f"\n  Students correct on ALL 5 questions: {n_all} / {len(post_df)} ({n_all/len(post_df):.1%})")

# ---- Figure 2: Per-principle accuracy bar chart ----
fig, ax = plt.subplots(figsize=(9, 5))
colors = [UTSA_NAVY, UTSA_ORANGE, UTSA_NAVY, UTSA_ORANGE, UTSA_NAVY]
bars = ax.barh(accuracy_df["Principle"], accuracy_df["Accuracy (%)"], color=colors, edgecolor="white")
ax.set_xlim(0, 105)
ax.set_xlabel("Accuracy (%)")
ax.set_title("RQ2 — Post-Survey Accuracy by Responsible AI Principle", fontsize=13)
for bar, val in zip(bars, accuracy_df["Accuracy (%)"]):
    ax.text(val + 1, bar.get_y() + bar.get_height() / 2,
            f"{val}%", va="center", fontsize=10)
ax.axvline(50, color="gray", linestyle="--", linewidth=0.8, alpha=0.6)
plt.tight_layout()
plt.savefig("fig2_rq2_per_principle_accuracy.png", dpi=150)
plt.close()
print("\n  Saved: fig2_rq2_per_principle_accuracy.png")

# ============================================================
# STEP 7 — RQ2: Gameplay Volume → Post-Survey Mastery
# ============================================================

print("\n" + "=" * 60)
print("RQ2: Gameplay Dosage vs Total Mastery (from sessions.json)")
print("=" * 60)

# This requires the name-matched master dataset from your notebook
# If you have cleaned_dumb_ways_to_ai_master.csv, load it here:
try:
    master = pd.read_csv("master_student_data.csv")
    has_master = True
    print("  Loaded master_student_data.csv")
except FileNotFoundError:
    has_master = False
    print("  [SKIP] master_student_data.csv not found.")
    print("  Place your master student data CSV in the same folder and rename it")
    print("  to master_student_data.csv, then re-run this script.")

if has_master:
    # Re-score if needed
    for col_name, keyword, answer in [
        ("s_general",        "NOT a principle",       "Friendly"),
        ("s_fairness",       "Developer Doom",        "The AI will unfairly favor students similar to those in its training data"),
        ("s_accountability", "autonomous vehicle",    "The developer of the autonomous vehicle"),
        ("s_transparency",   "transparency builds",   "Users can see how decisions are made, spot limitations, and challenge outcomes that seem wrong"),
    ]:
        if col_name not in master.columns:
            c = find_col(master, keyword)
            master[col_name] = master[c].str.strip().eq(answer).astype(int)

    if "s_privacy" not in master.columns:
        c = find_col(master, "respecting user privacy")
        def check_priv(val):
            if pd.isna(val): return 0
            sel = set(s.strip() for s in str(val).split(","))
            return 1 if (not (sel & PRIVACY_WRONG) and len(sel & PRIVACY_CORRECT) >= 2) else 0
        master["s_privacy"] = master[c].apply(check_priv)

    sc = ["s_general", "s_fairness", "s_accountability", "s_transparency", "s_privacy"]
    if "all_correct" not in master.columns:
        master["all_correct"] = (master[[c for c in sc if c in master.columns]].sum(axis=1)
                                 == len([c for c in sc if c in master.columns])).astype(int)

    # --- Dosage bins ---
    if "total_rounds" not in master.columns and all(
            c in master.columns for c in ["fair_play","trans_play","acc_play","priv_play"]):
        master["total_rounds"] = (master["fair_play"] + master["trans_play"]
                                  + master["acc_play"] + master["priv_play"])

    # Normalize column name — master CSV uses total_rounds_played
    if "total_rounds_played" in master.columns and "total_rounds" not in master.columns:
        master["total_rounds"] = master["total_rounds_played"]

    if "total_rounds" in master.columns:
        def dosage_bin(n):
            if pd.isna(n): return "No Data"
            if n <= 15:    return "Low (0-15)"
            if n <= 19:    return "Med (16-19)"
            return "High (20+)"

        master["dosage_level"] = master["total_rounds"].apply(dosage_bin)
        ct_dosage = pd.crosstab(master["dosage_level"], master["all_correct"])
        # CHI-SQUARE TEST OF INDEPENDENCE
        # Used because: both variables are categorical.
        #   - Dosage level: Low / Med / High (3 groups)
        #   - Mastery: 0 or 1 (got all 5 questions correct or not)
        # Chi-square tests whether the proportion of students achieving
        # mastery differs significantly across dosage groups.
        # Null hypothesis: dosage level and mastery are independent.
        chi2, p_dosage, _, _ = chi2_contingency(ct_dosage)

        print(f"\n  Chi-Square Test: Gameplay Dosage vs Total Mastery")
        print(f"  Null hypothesis: rounds played and mastery are independent")
        print(f"  Contingency table (rows = dosage group, cols = 0/1 mastery):")
        print(ct_dosage.to_string())
        print(f"  Chi-square statistic: {chi2:.4f}")
        print(f"  P-value: {p_dosage:.4f} {'*' if p_dosage < 0.05 else '(not significant)'}")
        print(f"  Interpretation: {'Dosage level significantly predicts mastery.' if p_dosage < 0.05 else 'No significant relationship — but note the trend in mastery rates.'}")

        dosage_summary = (master.groupby("dosage_level")["all_correct"]
                          .agg(["sum", "count"])
                          .rename(columns={"sum": "Mastery", "count": "N"}))
        dosage_summary["Mastery %"] = (dosage_summary["Mastery"] / dosage_summary["N"] * 100).round(1)
        dosage_summary = dosage_summary.reindex(["Low (0-15)", "Med (16-19)", "High (20+)"])

        print(f"\n  Mastery rate by dosage group:")
        print(dosage_summary.to_string())

    # --- 80% pass rate analysis ---
    if "challenge_pass_rate" in master.columns:
        master["passed_80"] = (master["challenge_pass_rate"] >= 80).astype(int)
        ct_80 = pd.crosstab(master["passed_80"], master["all_correct"])
        # CHI-SQUARE TEST OF INDEPENDENCE
        # Used because: both variables are binary/categorical.
        #   - Passed 80%: yes (1) or no (0)
        #   - Post-survey mastery: all correct (1) or not (0)
        # Tests whether students who succeeded in challenge mode were
        # significantly more likely to demonstrate post-survey mastery.
        # This is your key "game effectiveness" test.
        if ct_80.shape == (2, 2):
            chi2_80, p_80, _, _ = chi2_contingency(ct_80)
            n_passed = master["passed_80"].sum()
            passed_mastery = master[master["passed_80"] == 1]["all_correct"].mean()
            failed_mastery = master[master["passed_80"] == 0]["all_correct"].mean()

            print(f"\n  Chi-Square Test: Challenge 80% Pass Rate vs Post-Survey Mastery")
            print(f"  Null hypothesis: challenge performance and post-survey mastery are independent")
            print(f"  Contingency table (rows = passed 80%, cols = 0/1 mastery):")
            ct_80_labeled = pd.crosstab(
                master["passed_80"].map({1: "Passed 80%+", 0: "Below 80%"}),
                master["all_correct"].map({1: "All Correct", 0: "Not All Correct"}),
                rownames=["Challenge Performance"],
                colnames=["Post-Survey Mastery"]
            )
            print(ct_80_labeled.to_string())
            print(f"  Chi-square statistic: {chi2_80:.4f}")
            print(f"  P-value: {p_80:.4f} {'*' if p_80 < 0.05 else '(not significant)'}")
            print(f"  Students who passed 80%+ of rounds: {int(n_passed)}")
            print(f"  Mastery rate if passed 80%:  {passed_mastery:.1%}")
            print(f"  Mastery rate if below 80%:   {failed_mastery:.1%}")
            print(f"  Interpretation: {'Challenge pass rate significantly predicts post-survey mastery.' if p_80 < 0.05 else 'No significant relationship between challenge performance and post-survey mastery.'}")
        else:
            print("\n  [SKIP] Not enough variation in challenge_pass_rate to run chi-square.")
    else:
        print("\n  [SKIP] challenge_pass_rate not in master — re-run notebook Cell 2 to add it.")

# ============================================================
# STEP 8 — RQ3: Pre-Survey Attitude Profile (Participant Context)
#
# STATISTICAL APPROACH: Descriptive statistics only (counts + %)
# Why no inferential test? These Likert-scale items are used to
# characterize your participant sample in the Methods section —
# not to test a hypothesis. No post-survey equivalents exist,
# so no pre/post comparison is possible.
# In your paper, frame as: "Prior to the intervention, X% of
# students agreed that AI has the potential to positively
# impact daily life..."
# ============================================================

print("\n" + "=" * 60)
print("RQ3: Pre-Survey Attitude Baseline (Participant Context)")
print("=" * 60)

attitude_cols = {
    "AI positive impact": find_col(pre_df, "positively impact"),
    "Worried about bias":  find_col(pre_df, "worried about bias"),
    "Excited for careers": find_col(pre_df, "excited about"),
}

ORDER = ["Strongly agree", "Somewhat agree", "Neither agree nor disagree",
         "Somewhat disagree", "Strongly disagree"]

attitude_rows = []
for label, col in attitude_cols.items():
    counts = pre_df[col].value_counts().reindex(ORDER, fill_value=0)
    pct    = (counts / len(pre_df) * 100).round(1)
    row = {"Statement": label}
    for o in ORDER:
        row[o] = f"{int(counts[o])} ({pct[o]}%)"
    attitude_rows.append(row)

attitude_df = pd.DataFrame(attitude_rows)
print("\n  Pre-Survey Attitude Distribution:")
print(attitude_df.to_string(index=False))

# ---- Figure 3: Stacked attitude bar ----
LIKERT_COLORS = ["#1a6b3c", "#6fba7f", "#cccccc", "#e8896d", "#c0392b"]

fig, ax = plt.subplots(figsize=(11, 4))
lefts = {label: 0 for label in attitude_cols}
for i, response in enumerate(ORDER):
    vals = []
    for label, col in attitude_cols.items():
        counts = pre_df[col].value_counts().reindex(ORDER, fill_value=0)
        vals.append(counts[response] / len(pre_df) * 100)
    ax.barh(list(attitude_cols.keys()), vals,
            left=[lefts[k] for k in attitude_cols],
            color=LIKERT_COLORS[i], label=response, height=0.5)
    for j, (label, v) in enumerate(zip(attitude_cols.keys(), vals)):
        if v > 5:
            ax.text(lefts[label] + v / 2, j, f"{v:.0f}%",
                    ha="center", va="center", fontsize=8, color="white", fontweight="bold")
        lefts[label] += v

ax.set_xlim(0, 100)
ax.set_xlabel("Percentage of Students (%)")
ax.set_title("RQ3 — Pre-Survey: Student Attitudes Toward AI (N=89)", fontsize=13)
ax.legend(loc="lower right", fontsize=8, ncol=2)
plt.tight_layout()
plt.savefig("fig3_rq3_pre_attitude.png", dpi=150)
plt.close()
print("\n  Saved: fig3_rq3_pre_attitude.png")

# ============================================================
# STEP 9 — EXPORT CLEAN SUMMARY TO EXCEL
# ============================================================

print("\n" + "=" * 60)
print("Exporting summary tables to Excel...")
print("=" * 60)

with pd.ExcelWriter("dumb_ways_results_summary.xlsx", engine="openpyxl") as writer:

    # RQ1 summary
    rq1_summary = pd.DataFrame({
        "Metric": ["N", "Pre-Survey Accuracy", "Post-Survey Accuracy",
                   "Gain", "Paired t-test p-value", "McNemar p-value",
                   "Learners (wrong→right)", "Confused (right→wrong)",
                   "Both Correct", "Both Wrong"],
        "Value": [len(merged),
                  f"{pre_mean:.1%}", f"{post_mean:.1%}",
                  f"+{post_mean - pre_mean:.1%}",
                  f"{p_val:.4f}", f"{mcn_result.pvalue:.4f}",
                  int(mcn_c), int(mcn_b), int(mcn_a), int(mcn_d)]
    })
    rq1_summary.to_excel(writer, sheet_name="RQ1 Knowledge Gain", index=False)

    # RQ2 accuracy table
    accuracy_df.to_excel(writer, sheet_name="RQ2 Per-Principle Accuracy", index=False)

    # RQ3 attitude table
    attitude_df.to_excel(writer, sheet_name="RQ3 Attitude Baseline", index=False)

    # Full scored post-survey
    post_df[["Response ID"] + score_cols + ["total_score", "all_correct"]].to_excel(
        writer, sheet_name="Post-Survey Scored", index=False)

print("  Saved: dumb_ways_results_summary.xlsx")

# ============================================================
# DONE
# ============================================================

print("\n" + "=" * 60)
print("All done! Files produced:")
print("  fig1_rq1_answer_shift.png")
print("  fig2_rq2_per_principle_accuracy.png")
print("  fig3_rq3_pre_attitude.png")
print("  dumb_ways_results_summary.xlsx")
print("=" * 60)