"""
Extended Correlation Matrix
============================
Runs correlations between ALL gameplay variables including:
  - Tutorial pass/fail (fairness, transparency, accountability, privacy)
  - Challenge performance (pass rate, difficulty, rounds, score)
  - Learning outcome

This is what the professor flagged as having significant results.
We are looking for correlations between TUTORIAL outcomes and 
CHALLENGE PERFORMANCE variables specifically.

Run from your stats folder.
Outputs:
  - fig_full_correlation_matrix.png
  - extended_correlations.xlsx
"""

import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import pearsonr
import warnings
warnings.filterwarnings('ignore')

UTSA_NAVY = "#003366"

# ── Load ──────────────────────────────────────────────────────────────────────

master = pd.read_csv("master_student_data.csv")
post_df = pd.read_csv("dumb_ways_to_ai_post_survey.csv")
pre_df  = pd.read_csv("dumb_ways_to_ai_pre_survey.csv")

with open("sessions.json") as f:
    all_sessions = json.load(f)

def find_col(df, keyword):
    matches = [c for c in df.columns if keyword.lower() in c.lower()]
    return matches[0] if matches else None

# ── Score learning outcome ────────────────────────────────────────────────────

pre_col  = find_col(pre_df,  'NOT a principle')
post_col = find_col(post_df, 'NOT a principle')

pre_correct  = pre_df[pre_col].str.strip().eq('Friendly').astype(int)
post_correct = post_df[post_col].str.strip().eq('Friendly').astype(int)
learning_outcome = ((pre_correct == 0) & (post_correct == 1)).astype(int)

# ── Parse sessions for all variables ─────────────────────────────────────────

records = []
for session_key, data in all_sessions.items():
    try:
        score  = data.get('result', {}).get('finalScore', 0)
        tuts   = data.get('tutorials', {})
        rounds = data.get('challenge', {}).get('rounds', [])
        total  = len(rounds)
        wins   = sum(1 for r in rounds if r.get('win', False))

        diff_map = {'easy':1,'medium':2,'hard':3,'veryhard':4,
                    'veryHard':4,'impossible':5}
        reached = 0
        for r in rounds:
            d = r.get('difficulty','').lower().replace('_','').replace(' ','')
            reached = max(reached, diff_map.get(d, 0))

        record = {
            'game_score':       score,
            'total_rounds':     total,
            'challenge_pass_rate': round(wins/total*100,1) if total>0 else np.nan,
            'challenge_passed_80': 1 if total>0 and wins/total>=0.80 else 0,
            'difficulty_level': reached,
        }

        for principle in ['fairness','transparency','accountability','privacy']:
            t = tuts.get(principle, {})
            record[f'tut_{principle}'] = 1 if t.get('passed', False) else 0
            record[f'tut_{principle}_ms'] = t.get('durationMs', np.nan)

        records.append(record)
    except Exception:
        continue

session_df = (pd.DataFrame(records)
              .sort_values('game_score', ascending=False)
              .drop_duplicates('game_score')
              .reset_index(drop=True))

# ── Merge everything positionally ─────────────────────────────────────────────

# Drop columns already in master to avoid conflicts
already = [c for c in session_df.columns
           if c != 'game_score' and c in master.columns]
session_clean = session_df.drop(columns=already, errors='ignore')
merged = pd.merge(master, session_clean, on='game_score', how='left')

# Normalize total_rounds
if 'total_rounds_played' in merged.columns and 'total_rounds' not in merged.columns:
    merged['total_rounds'] = merged['total_rounds_played']

# Trim to 89 rows to match surveys
merged = merged.head(89).reset_index(drop=True)

# Add learning outcome
merged['learning_outcome'] = learning_outcome.values

# ── Build analysis dataframe ──────────────────────────────────────────────────

var_map = {
    'Learning Outcome':          'learning_outcome',
    'Total Rounds':              'total_rounds',
    'Difficulty Reached':        'difficulty_level',
    'Challenge Pass Rate':       'challenge_pass_rate',
    'Challenge Passed 80%':      'challenge_passed_80',
    'Tutorial: Fairness':        'tut_fairness',
    'Tutorial: Transparency':    'tut_transparency',
    'Tutorial: Accountability':  'tut_accountability',
    'Tutorial: Privacy':         'tut_privacy',
}

corr_data = {}
for label, col in var_map.items():
    if col in merged.columns:
        corr_data[label] = pd.to_numeric(merged[col], errors='coerce')
    else:
        print(f"  Skipping {label} — '{col}' not found")

corr_df = pd.DataFrame(corr_data).dropna(how='all')
print(f"\nAnalysis rows: {len(corr_df)}")

# ── Compute correlations and p-values ─────────────────────────────────────────

corr_matrix = corr_df.corr(method='pearson')
p_matrix    = pd.DataFrame(np.ones_like(corr_matrix),
                            index=corr_matrix.index,
                            columns=corr_matrix.columns)

for col_i in corr_df.columns:
    for col_j in corr_df.columns:
        if col_i != col_j:
            valid = corr_df[[col_i, col_j]].dropna()
            if len(valid) > 2:
                _, p_val = pearsonr(valid[col_i], valid[col_j])
                p_matrix.loc[col_i, col_j] = p_val

# ── Print ALL correlations with significance ──────────────────────────────────

print("\n" + "=" * 70)
print("FULL CORRELATION TABLE")
print("(Point Biserial / Phi — Pearson r for binary/continuous pairs)")
print("=" * 70)
print(f"{'Variable 1':<30} {'Variable 2':<30} {'r':>8} {'p':>10} {'Sig':>5}")
print("-" * 70)

results = []
seen = set()
for col_i in corr_matrix.columns:
    for col_j in corr_matrix.columns:
        if col_i == col_j:
            continue
        pair = tuple(sorted([col_i, col_j]))
        if pair in seen:
            continue
        seen.add(pair)
        r   = corr_matrix.loc[col_i, col_j]
        p   = p_matrix.loc[col_i, col_j]
        sig = '***' if p < 0.001 else '**' if p < 0.01 else '*' if p < 0.05 else ''
        results.append({
            'Variable 1': col_i,
            'Variable 2': col_j,
            'r': round(r, 4),
            'p-value': round(p, 4),
            'Significant': sig
        })
        if sig:  # print significant ones prominently
            print(f"{col_i:<30} {col_j:<30} {r:>8.4f} {p:>10.4f} {sig:>5}  ← SIGNIFICANT")

# Print all
print("\n\nAll correlations with Learning Outcome:")
print(f"{'Variable':<35} {'r':>8} {'p-value':>10} {'Sig':>5}")
print("-" * 60)
for col in corr_matrix.columns:
    if col == 'Learning Outcome':
        continue
    r = corr_matrix.loc['Learning Outcome', col]
    p = p_matrix.loc['Learning Outcome', col]
    sig = '***' if p<0.001 else '**' if p<0.01 else '*' if p<0.05 else ''
    print(f"{col:<35} {r:>8.4f} {p:>10.4f} {sig:>5}")

print("\n\nAll correlations with Challenge Pass Rate:")
print(f"{'Variable':<35} {'r':>8} {'p-value':>10} {'Sig':>5}")
print("-" * 60)
for col in corr_matrix.columns:
    if col == 'Challenge Pass Rate':
        continue
    r = corr_matrix.loc['Challenge Pass Rate', col]
    p = p_matrix.loc['Challenge Pass Rate', col]
    sig = '***' if p<0.001 else '**' if p<0.01 else '*' if p<0.05 else ''
    print(f"{col:<35} {r:>8.4f} {p:>10.4f} {sig:>5}")

print("\n\nAll correlations with Difficulty Reached:")
print(f"{'Variable':<35} {'r':>8} {'p-value':>10} {'Sig':>5}")
print("-" * 60)
for col in corr_matrix.columns:
    if col == 'Difficulty Reached':
        continue
    r = corr_matrix.loc['Difficulty Reached', col]
    p = p_matrix.loc['Difficulty Reached', col]
    sig = '***' if p<0.001 else '**' if p<0.01 else '*' if p<0.05 else ''
    print(f"{col:<35} {r:>8.4f} {p:>10.4f} {sig:>5}")

# ── Heatmap with significance stars ──────────────────────────────────────────

annot = pd.DataFrame('', index=corr_matrix.index, columns=corr_matrix.columns)
for i in corr_matrix.index:
    for j in corr_matrix.columns:
        r = corr_matrix.loc[i, j]
        p = p_matrix.loc[i, j]
        sig = '*' if (p < 0.05 and i != j) else ''
        sig2 = '**' if (p < 0.01 and i != j) else sig
        annot.loc[i, j] = f"{r:.2f}{sig2}"

fig, ax = plt.subplots(figsize=(11, 9))
sns.heatmap(
    corr_matrix,
    annot=annot,
    fmt='',
    cmap='coolwarm',
    center=0,
    vmin=-1, vmax=1,
    linewidths=0.5,
    ax=ax,
    annot_kws={'size': 8.5}
)
ax.set_title(
    "Full Correlation Matrix — All Gameplay and Learning Variables\n"
    "* = p < 0.05   ** = p < 0.01   (Point Biserial / Phi Correlation)",
    fontsize=12, fontweight='bold', pad=15
)
plt.xticks(rotation=35, ha='right', fontsize=8)
plt.yticks(rotation=0, fontsize=8)
plt.tight_layout()
plt.savefig("fig_full_correlation_matrix.png", dpi=150, bbox_inches='tight')
plt.close()
print("\nSaved: fig_full_correlation_matrix.png")

# ── Export to Excel ───────────────────────────────────────────────────────────

results_df = pd.DataFrame(results).sort_values('p-value')
sig_df     = results_df[results_df['Significant'] != '']

with pd.ExcelWriter("extended_correlations.xlsx", engine="openpyxl") as writer:
    results_df.to_excel(writer, sheet_name='All Correlations', index=False)
    sig_df.to_excel(writer, sheet_name='Significant Only', index=False)
    corr_matrix.round(4).to_excel(writer, sheet_name='Matrix (r)')
    p_matrix.round(4).to_excel(writer, sheet_name='Matrix (p-values)')

print("Saved: extended_correlations.xlsx")
print("\nDone!")