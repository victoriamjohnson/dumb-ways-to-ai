"""
Professor-Recommended Analysis
================================
Implements the learning outcome variable as defined by professor:
  Learning Outcome = 1 if pre-survey WRONG and post-survey CORRECT
  Learning Outcome = 0 for all other combinations

Then runs:
  1. Chi-Square: Minigame frequency (Low/Med/High) vs Learning Outcome
  2. Chi-Square: Tutorial pass/fail (each principle) vs Learning Outcome
  3. Chi-Square: Challenge 80% pass rate vs Learning Outcome
  4. Point biserial / Phi correlation matrix
  5. Saves contingency tables to Excel
  6. Saves correlation matrix heatmap as PNG

Run from the same folder as:
  - dumb_ways_to_ai_pre_survey.csv
  - dumb_ways_to_ai_post_survey.csv
  - master_student_data.csv  (already has game_score, total_rounds, pass_rate etc.)
  - sessions.json
"""

import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import seaborn as sns
from scipy.stats import chi2_contingency, pointbiserialr
import warnings
warnings.filterwarnings('ignore')

UTSA_NAVY   = "#003366"
UTSA_ORANGE = "#F15A22"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — LOAD DATA
# ─────────────────────────────────────────────────────────────────────────────

print("=" * 60)
print("Loading data...")
print("=" * 60)

pre_df   = pd.read_csv("dumb_ways_to_ai_pre_survey.csv")
post_df  = pd.read_csv("dumb_ways_to_ai_post_survey.csv")
master   = pd.read_csv("master_student_data.csv")

with open("sessions.json") as f:
    all_sessions = json.load(f)

def find_col(df, keyword):
    matches = [c for c in df.columns if keyword.lower() in c.lower()]
    if not matches:
        raise ValueError(f"No column containing: '{keyword}'")
    return matches[0]

print(f"  Pre-survey rows:  {len(pre_df)}")
print(f"  Post-survey rows: {len(post_df)}")
print(f"  Master rows:      {len(master)}")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — CREATE LEARNING OUTCOME VARIABLE
# Professor definition:
#   LO = 1 if pre-survey WRONG AND post-survey CORRECT (true learners)
#   LO = 0 for all other combinations
# This uses the one matched question: "Which is NOT a principle of RAI?"
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("Creating Learning Outcome variable...")
print("=" * 60)

pre_col  = find_col(pre_df,  'NOT a principle')
post_col = find_col(post_df, 'NOT a principle')

pre_scores  = pre_df[pre_col].str.strip().eq('Friendly').astype(int).rename('pre_correct')
post_scores = post_df[post_col].str.strip().eq('Friendly').astype(int).rename('post_correct')

# Merge on position (Response IDs are matched)
survey_df = pd.DataFrame({
    'Response_ID':   pre_df['Response ID'],
    'pre_correct':   pre_scores,
    'post_correct':  post_scores
})

# Learning Outcome: wrong → right only
survey_df['learning_outcome'] = (
    (survey_df['pre_correct'] == 0) & (survey_df['post_correct'] == 1)
).astype(int)

n = len(survey_df)
n_learners = survey_df['learning_outcome'].sum()
pre_mean   = survey_df['pre_correct'].mean()
post_mean  = survey_df['post_correct'].mean()

print(f"\n  N = {n}")
print(f"  Pre-survey accuracy:  {pre_mean:.1%}")
print(f"  Post-survey accuracy: {post_mean:.1%}")
print(f"\n  Learning Outcome breakdown:")
print(f"    Wrong → Right (LO=1, true learners): {n_learners} ({n_learners/n:.1%})")
print(f"    All other combinations (LO=0):        {n - n_learners} ({(n-n_learners)/n:.1%})")

# Breakdown of all 4 combinations
ww = ((survey_df['pre_correct']==0) & (survey_df['post_correct']==0)).sum()
wr = n_learners
rw = ((survey_df['pre_correct']==1) & (survey_df['post_correct']==0)).sum()
rr = ((survey_df['pre_correct']==1) & (survey_df['post_correct']==1)).sum()

print(f"\n  All 4 combinations:")
print(f"    Wrong → Wrong: {ww} (did not learn)")
print(f"    Wrong → Right: {wr} (LEARNED — LO=1)")
print(f"    Right → Wrong: {rw} (forgot)")
print(f"    Right → Right: {rr} (already knew)")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — MERGE GAMEPLAY DATA
# ─────────────────────────────────────────────────────────────────────────────

# Parse sessions: get tutorial pass/fail + gameplay stats per student
session_records = []
for session_key, data in all_sessions.items():
    try:
        score  = data.get('result', {}).get('finalScore', 0)
        tuts   = data.get('tutorials', {})
        rounds = data.get('challenge', {}).get('rounds', [])
        total  = len(rounds)
        wins   = sum(1 for r in rounds if r.get('win', False))

        record = {
            'game_score':              score,
            'total_rounds':            total,
            'challenge_pass_rate':     round(wins/total*100, 1) if total > 0 else np.nan,
            'challenge_passed_80':     1 if total > 0 and wins/total >= 0.80 else 0,
        }

        # Highest difficulty
        difficulties = [r.get('difficulty','') for r in rounds]
        diff_order   = ['easy','medium','hard','veryHard','impossible']
        reached = 0
        for r in rounds:
            d = r.get('difficulty','').lower().replace('_','').replace(' ','')
            lvl = {'easy':1,'medium':2,'hard':3,'veryhard':4,'impossible':5}.get(d, 0)
            reached = max(reached, lvl)
        record['difficulty_level'] = reached

        for principle in ['fairness','transparency','accountability','privacy']:
            t = tuts.get(principle, {})
            record[f'tut_{principle}_passed'] = 1 if t.get('passed', False) else 0

        session_records.append(record)
    except Exception:
        continue

session_df = (pd.DataFrame(session_records)
              .sort_values('game_score', ascending=False)
              .drop_duplicates('game_score')
              .reset_index(drop=True))

# Drop columns from session_df already patched into master to avoid _x/_y conflicts
already_in_master = [c for c in session_df.columns
                     if c != 'game_score' and c in master.columns]
session_df_clean = session_df.drop(columns=already_in_master, errors='ignore')

# Merge master (already patched) with session for tutorial/difficulty columns
master_session = pd.merge(master, session_df_clean, on='game_score', how='left')

# Normalize total_rounds before concat
if 'total_rounds_played' in master_session.columns and 'total_rounds' not in master_session.columns:
    master_session['total_rounds'] = master_session['total_rounds_played']

# Trim master to match survey length (master has 90, survey has 89)
if len(master_session) != len(survey_df):
    print(f"  Warning: master ({len(master_session)}) and survey ({len(survey_df)}) row counts differ — trimming.")
    master_session = master_session.head(len(survey_df))

analysis_df = pd.concat([
    survey_df.reset_index(drop=True),
    master_session.reset_index(drop=True)
], axis=1)

# Final normalize
if 'total_rounds_played' in analysis_df.columns and 'total_rounds' not in analysis_df.columns:
    analysis_df['total_rounds'] = analysis_df['total_rounds_played']

# Show what challenge columns came through
print("\n  Challenge-related columns found:")
for c in [col for col in analysis_df.columns if 'challenge' in col.lower() or 'pass_rate' in col.lower()]:
    print(f"    {c}: {analysis_df[c].notna().sum()} non-null values")

# Dosage bins
def dosage_bin(n):
    if pd.isna(n): return np.nan
    if n <= 15:    return 0   # Low
    if n <= 19:    return 1   # Med
    return 2                  # High

analysis_df['dosage_group'] = analysis_df['total_rounds'].apply(dosage_bin)
analysis_df['dosage_label'] = analysis_df['dosage_group'].map({0:'Low (0-15)', 1:'Med (16-19)', 2:'High (20+)'})

print(f"\n  Analysis dataset rows: {len(analysis_df)}")

# ─────────────────────────────────────────────────────────────────────────────
# HELPER: print and return chi-square result
# ─────────────────────────────────────────────────────────────────────────────

def run_chi_square(ct, label):
    print(f"\n--- {label} ---")
    print(ct.to_string())
    if ct.shape[0] < 2 or ct.shape[1] < 2:
        print("  [Cannot compute — insufficient variation]")
        return None, None
    chi2, p, dof, expected = chi2_contingency(ct)
    if (expected < 5).any():
        print(f"  WARNING: Some expected counts < 5. Interpret with caution.")
    print(f"  Chi-square statistic: {chi2:.4f}")
    print(f"  P-value: {p:.4f} {'* (significant)' if p < 0.05 else '(not significant)'}")
    return chi2, p

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — CHI-SQUARE: MINIGAME FREQUENCY vs LEARNING OUTCOME
# This is the exact test your professor recommended
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("CHI-SQUARE: Minigame Frequency vs Learning Outcome")
print("(Professor's recommended contingency table)")
print("=" * 60)

sub = analysis_df[['dosage_label','learning_outcome']].dropna()
ct_dosage = pd.crosstab(
    sub['learning_outcome'].map({1:'Positive Learning Outcome (1)', 0:'No Learning Outcome (0)'}),
    sub['dosage_label'],
    rownames=['Learning Outcome'],
    colnames=['Frequency of Mini Games']
)
# Reorder columns
col_order = [c for c in ['Low (0-15)','Med (16-19)','High (20+)'] if c in ct_dosage.columns]
ct_dosage = ct_dosage[col_order]

# Add row totals
ct_dosage['Row Totals'] = ct_dosage.sum(axis=1)
ct_dosage.loc['Column Totals'] = ct_dosage.sum()

print("\nContingency Table (as shown by professor):")
print(ct_dosage.to_string())

# Run chi-square on the values without totals
ct_for_test = ct_dosage.drop(index='Column Totals', errors='ignore')
ct_for_test = ct_for_test.drop(columns='Row Totals', errors='ignore')
chi2_dosage, p_dosage = run_chi_square(ct_for_test, "Minigame Frequency vs Learning Outcome")

# Learning rates by group
print("\n  Learning rate by dosage group:")
for label in ['Low (0-15)','Med (16-19)','High (20+)']:
    group = sub[sub['dosage_label'] == label]
    if len(group) > 0:
        rate = group['learning_outcome'].mean() * 100
        n_g  = len(group)
        n_lo = group['learning_outcome'].sum()
        print(f"    {label}: {int(n_lo)}/{n_g} students learned ({rate:.1f}%)")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — CHI-SQUARE: TUTORIAL PASS/FAIL vs LEARNING OUTCOME
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("CHI-SQUARE: Tutorial Pass/Fail vs Learning Outcome")
print("=" * 60)

for principle in ['fairness','transparency','accountability','privacy']:
    tut_col = f'tut_{principle}_passed'
    if tut_col not in analysis_df.columns:
        print(f"\n  {principle.title()}: column not found, skipping")
        continue
    sub2 = analysis_df[[tut_col,'learning_outcome']].dropna()
    ct2 = pd.crosstab(
        sub2[tut_col].map({1:'Tutorial Passed', 0:'Tutorial Failed'}),
        sub2['learning_outcome'].map({1:'LO=1 (Learned)', 0:'LO=0 (Other)'}),
        rownames=['Tutorial Outcome'],
        colnames=['Learning Outcome']
    )
    chi2_t, p_t = run_chi_square(ct2, f"{principle.title()} — Tutorial vs Learning Outcome")

    for outcome, label in [(1,'Passed'), (0,'Failed')]:
        grp = sub2[sub2[tut_col]==outcome]
        if len(grp) > 0:
            rate = grp['learning_outcome'].mean()*100
            print(f"    Tutorial {label} → {rate:.1f}% showed learning (N={len(grp)})")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — CHI-SQUARE: CHALLENGE 80% PASS RATE vs LEARNING OUTCOME
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("CHI-SQUARE: Challenge 80% Pass Rate vs Learning Outcome")
print("=" * 60)

if 'challenge_passed_80' in analysis_df.columns:
    sub3 = analysis_df[['challenge_passed_80','learning_outcome']].dropna()
    ct3 = pd.crosstab(
        sub3['challenge_passed_80'].map({1:'Passed 80%+', 0:'Below 80%'}),
        sub3['learning_outcome'].map({1:'LO=1 (Learned)', 0:'LO=0 (Other)'}),
        rownames=['Challenge Performance'],
        colnames=['Learning Outcome']
    )
    chi2_80, p_80 = run_chi_square(ct3, "Challenge 80% Pass Rate vs Learning Outcome")
    for outcome, label in [(1,'Passed 80%+'), (0,'Below 80%')]:
        grp = sub3[sub3['challenge_passed_80']==outcome]
        if len(grp) > 0:
            rate = grp['learning_outcome'].mean()*100
            print(f"    {label} → {rate:.1f}% showed learning (N={len(grp)})")
else:
    print("  challenge_passed_80 not found — run patch_add_pass_rate.py first")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — POINT BISERIAL / PHI CORRELATION MATRIX
# Binary variable: learning_outcome
# Other variables: total_rounds, difficulty_level, challenge_pass_rate,
#                  tut_fairness_passed, tut_transparency_passed,
#                  tut_accountability_passed, tut_privacy_passed
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("CORRELATION MATRIX")
print("(Point biserial / Phi — all vs Learning Outcome)")
print("=" * 60)

corr_vars = {
    'Learning Outcome':          'learning_outcome',
    'Total Rounds Played':       'total_rounds',
    'Difficulty Level Reached':  'difficulty_level',
    'Challenge Pass Rate (%)':   'challenge_pass_rate',
    'Challenge Passed 80%':      'challenge_passed_80',
    'Tutorial: Fairness':        'tut_fairness_passed',
    'Tutorial: Transparency':    'tut_transparency_passed',
    'Tutorial: Accountability':  'tut_accountability_passed',
    'Tutorial: Privacy':         'tut_privacy_passed',
}

# Build correlation dataframe
corr_data = {}
for label, col in corr_vars.items():
    if col in analysis_df.columns:
        corr_data[label] = pd.to_numeric(analysis_df[col], errors='coerce')
    else:
        print(f"  Skipping {label} — column '{col}' not found")

corr_df = pd.DataFrame(corr_data).dropna(how='all')

# Compute Pearson correlation (= point biserial when one variable is binary,
# = phi when both are binary)
corr_matrix = corr_df.corr(method='pearson')
p_matrix    = pd.DataFrame(np.ones_like(corr_matrix), 
                            index=corr_matrix.index, 
                            columns=corr_matrix.columns)

# Compute p-values for each pair
from scipy.stats import pearsonr
for i, col_i in enumerate(corr_df.columns):
    for j, col_j in enumerate(corr_df.columns):
        if i != j:
            valid = corr_df[[col_i, col_j]].dropna()
            if len(valid) > 2:
                _, p_val = pearsonr(valid[col_i], valid[col_j])
                p_matrix.loc[col_i, col_j] = p_val

# Print correlation with learning outcome specifically
print("\n  Correlations with Learning Outcome:")
print(f"  {'Variable':<35} {'r':>8} {'p-value':>10} {'Sig':>5}")
print("  " + "-" * 62)
lo_label = 'Learning Outcome'
for label in corr_matrix.columns:
    if label == lo_label:
        continue
    r   = corr_matrix.loc[lo_label, label]
    p   = p_matrix.loc[lo_label, label]
    sig = '*' if p < 0.05 else ''
    print(f"  {label:<35} {r:>8.4f} {p:>10.4f} {sig:>5}")

# ---- Heatmap ----
fig, ax = plt.subplots(figsize=(11, 9))

# Create annotation with r and * for significant
annot = pd.DataFrame('', index=corr_matrix.index, columns=corr_matrix.columns)
for i in corr_matrix.index:
    for j in corr_matrix.columns:
        r   = corr_matrix.loc[i, j]
        p   = p_matrix.loc[i, j]
        sig = '*' if (p < 0.05 and i != j) else ''
        annot.loc[i, j] = f"{r:.2f}{sig}"

sns.heatmap(
    corr_matrix,
    annot=annot,
    fmt='',
    cmap='coolwarm',
    center=0,
    vmin=-1, vmax=1,
    linewidths=0.5,
    ax=ax,
    annot_kws={'size': 9}
)

ax.set_title(
    "Correlation Matrix — Learning Outcome and Gameplay Variables\n"
    "(* = p < 0.05   |   Point Biserial / Phi Correlation)",
    fontsize=12, fontweight='bold', pad=15
)
plt.xticks(rotation=35, ha='right', fontsize=8)
plt.yticks(rotation=0, fontsize=8)
plt.tight_layout()
plt.savefig("fig_correlation_matrix.png", dpi=150, bbox_inches='tight')
plt.close()
print("\n  Saved: fig_correlation_matrix.png")

# ─────────────────────────────────────────────────────────────────────────────
# STEP 8 — EXPORT TO EXCEL
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("Exporting to Excel...")
print("=" * 60)

with pd.ExcelWriter("learning_outcome_results.xlsx", engine="openpyxl") as writer:

    # Sheet 1: Learning outcome summary
    lo_summary = pd.DataFrame({
        'Combination': ['Wrong → Right (Learned)', 'Wrong → Wrong', 
                        'Right → Wrong (Forgot)', 'Right → Right (Already knew)'],
        'N': [wr, ww, rw, rr],
        'Pct': [f"{wr/n:.1%}", f"{ww/n:.1%}", f"{rw/n:.1%}", f"{rr/n:.1%}"],
        'Learning Outcome': [1, 0, 0, 0]
    })
    lo_summary.to_excel(writer, sheet_name='Learning Outcome Definition', index=False)

    # Sheet 2: Professor's contingency table
    ct_dosage.to_excel(writer, sheet_name='Chi-Sq Dosage vs LO')

    # Sheet 3: Correlation matrix
    corr_matrix.round(4).to_excel(writer, sheet_name='Correlation Matrix (r)')
    p_matrix.round(4).to_excel(writer, sheet_name='Correlation Matrix (p-values)')

print("  Saved: learning_outcome_results.xlsx")

print("\n" + "=" * 60)
print("All done! Files produced:")
print("  fig_correlation_matrix.png")
print("  learning_outcome_results.xlsx")
print("=" * 60)