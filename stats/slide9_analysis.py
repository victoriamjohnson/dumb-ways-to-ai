"""
Slide 9 Analysis Script
========================
Produces:
  1. fig_rq2_per_question_breakdown.png  -- 6-panel chart (1 overall + 5 per question)
  2. fig_mechanic_vs_accuracy.png        -- mechanic breakdown table/chart
  3. fig_q1_qualitative.png             -- Q1 free response thematic coding table
  4. fig_q2_qualitative.png             -- Q2 free response thematic coding table
  5. Printed output: tutorial pass/fail chi-square tests for each principle

Run from the same folder as:
  - dumb_ways_to_ai_post_survey.csv
  - sessions.json
"""

import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy.stats import chi2_contingency
import warnings
warnings.filterwarnings('ignore')

UTSA_NAVY   = "#003366"
UTSA_ORANGE = "#F15A22"
GRAY        = "#AAAAAA"

# ─────────────────────────────────────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────────────────────────────────────

post_df = pd.read_csv("dumb_ways_to_ai_post_survey.csv")

with open("sessions.json") as f:
    all_sessions = json.load(f)

def find_col(df, keyword):
    matches = [c for c in df.columns if keyword.lower() in c.lower()]
    if not matches:
        raise ValueError(f"No column found containing: '{keyword}'")
    return matches[0]

# ─────────────────────────────────────────────────────────────────────────────
# SCORE POST-SURVEY QUESTIONS
# ─────────────────────────────────────────────────────────────────────────────

PRIVACY_CORRECT = {
    "Deleting user data when it is no longer needed",
    "Only requesting permissions the app needs to function",
    "Being clear about what data is collected and why"
}
PRIVACY_WRONG = {
    "Collecting extra data just in case it becomes useful later",
    "Sharing user data with partners without telling users"
}

def score_privacy(val):
    if pd.isna(val): return 0
    selected = set(s.strip() for s in str(val).split(","))
    return 1 if (not (selected & PRIVACY_WRONG) and len(selected & PRIVACY_CORRECT) >= 2) else 0

post_df['s_general']        = post_df[find_col(post_df, 'NOT a principle')].str.strip().eq('Friendly').astype(int)
post_df['s_fairness']       = post_df[find_col(post_df, 'Developer Doom')].str.strip().eq('The AI will unfairly favor students similar to those in its training data').astype(int)
post_df['s_accountability'] = post_df[find_col(post_df, 'autonomous vehicle')].str.strip().eq('The developer of the autonomous vehicle').astype(int)
post_df['s_transparency']   = post_df[find_col(post_df, 'transparency builds')].str.strip().eq('Users can see how decisions are made, spot limitations, and challenge outcomes that seem wrong').astype(int)
post_df['s_privacy']        = post_df[find_col(post_df, 'respecting user privacy')].apply(score_privacy)

score_cols = ['s_general', 's_fairness', 's_accountability', 's_transparency', 's_privacy']
post_df['all_correct'] = (post_df[score_cols].sum(axis=1) == 5).astype(int)

n = len(post_df)

# ─────────────────────────────────────────────────────────────────────────────
# FIGURE 1: 6-PANEL PER-QUESTION BREAKDOWN
# ─────────────────────────────────────────────────────────────────────────────

questions = [
    ("Accountability", 's_accountability',
     "Who is to blame when a self-driving car\nmakes a mistake?",
     "The developer of the autonomous vehicle"),
    ("Fairness", 's_fairness',
     "What happens when Developer Doom trains\nan AI on biased data?",
     "The AI will unfairly favor students\nsimilar to those in its training data"),
    ("Privacy", 's_privacy',
     "Which actions show a developer\nrespecting user privacy? (Select all)",
     "Deleting data + Only requesting\nnecessary permissions"),
    ("Transparency", 's_transparency',
     "Why does AI transparency\nbuild user trust?",
     "Users can see decisions, spot\nlimitations, and challenge outcomes"),
    ("General\n(NOT a principle)", 's_general',
     "Which of these is NOT a\nResponsible AI principle?",
     "Friendly"),
]

fig, axes = plt.subplots(2, 3, figsize=(16, 10))
fig.suptitle("RQ2 — Post-Survey Accuracy by Responsible AI Principle", 
             fontsize=16, fontweight='bold', y=1.01)

# Panel 0: Overall summary bar chart
ax0 = axes[0, 0]
labels_short = ["Accountability", "Fairness", "Privacy", "Transparency", "General"]
accuracies    = [
    post_df['s_accountability'].mean() * 100,
    post_df['s_fairness'].mean() * 100,
    post_df['s_privacy'].mean() * 100,
    post_df['s_transparency'].mean() * 100,
    post_df['s_general'].mean() * 100,
]
colors = [UTSA_NAVY, UTSA_ORANGE, UTSA_NAVY, UTSA_ORANGE, UTSA_NAVY]
bars = ax0.barh(labels_short, accuracies, color=colors, edgecolor='white', height=0.6)
ax0.set_xlim(0, 105)
ax0.axvline(50, color='gray', linestyle='--', linewidth=0.8, alpha=0.5)
ax0.set_xlabel("Accuracy (%)")
ax0.set_title("Overall: All 5 Questions", fontweight='bold', fontsize=11)
for bar, val in zip(bars, accuracies):
    ax0.text(val + 1, bar.get_y() + bar.get_height() / 2,
             f"{val:.1f}%", va='center', fontsize=9)
all_correct_n = post_df['all_correct'].sum()
ax0.text(0.5, -0.18, f"All 5 correct: {all_correct_n}/89 ({all_correct_n/n*100:.1f}%)",
         transform=ax0.transAxes, ha='center', fontsize=9, style='italic')

# Panels 1-5: One per question
panel_positions = [(0,1), (0,2), (1,0), (1,1), (1,2)]
principle_colors = [UTSA_NAVY, UTSA_ORANGE, UTSA_NAVY, UTSA_ORANGE, UTSA_NAVY]

for idx, (principle, col, question_text, correct_answer) in enumerate(questions):
    row, c = panel_positions[idx]
    ax = axes[row, c]

    correct   = int(post_df[col].sum())
    incorrect = n - correct
    pct       = correct / n * 100

    # Pie chart
    wedge_colors = [principle_colors[idx], GRAY]
    wedges, texts, autotexts = ax.pie(
        [correct, incorrect],
        labels=[f"Correct\n{correct}", f"Incorrect\n{incorrect}"],
        colors=wedge_colors,
        autopct='%1.1f%%',
        startangle=90,
        textprops={'fontsize': 9}
    )
    for at in autotexts:
        at.set_fontsize(9)
        at.set_fontweight('bold')
        at.set_color('white')

    ax.set_title(f"{principle}\n{pct:.1f}% correct",
                 fontweight='bold', fontsize=10)

    # Add question text below
    ax.text(0, -1.35, f"Q: {question_text}",
            ha='center', va='center', fontsize=7,
            wrap=True, style='italic',
            transform=ax.transData)

plt.tight_layout()
plt.savefig("fig_rq2_per_question_breakdown.png", dpi=150, bbox_inches='tight')
plt.close()
print("Saved: fig_rq2_per_question_breakdown.png")


# ─────────────────────────────────────────────────────────────────────────────
# FIGURE 2: MECHANIC VS ACCURACY TABLE
# ─────────────────────────────────────────────────────────────────────────────

mechanic_data = {
    "Principle":         ["Accountability", "Fairness",          "Privacy",           "Transparency"],
    "Mechanic":          ["Mash SPACE bar", "Calculate & remove", "Toggle ON/OFF",    "Click on timing"],
    "Thinking Required": ["None",           "Yes — math/logic",  "Yes — decisions",  "None"],
    "Lives Lost":        [69,               118,                  146,                50],
    "Post-Survey\nAccuracy": ["79.8%",      "73.0%",             "71.9%",            "67.4%"],
}

df_mech = pd.DataFrame(mechanic_data)

fig, ax = plt.subplots(figsize=(13, 3.5))
ax.axis('off')

col_labels = list(mechanic_data.keys())
cell_data  = df_mech.values.tolist()

table = ax.table(
    cellText=cell_data,
    colLabels=col_labels,
    cellLoc='center',
    loc='center'
)
table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1.2, 2.2)

# Style header
for j in range(len(col_labels)):
    table[0, j].set_facecolor(UTSA_NAVY)
    table[0, j].set_text_props(color='white', fontweight='bold')

# Style rows
row_colors = ['#E8EEF5', 'white']
for i in range(1, len(cell_data) + 1):
    for j in range(len(col_labels)):
        table[i, j].set_facecolor(row_colors[(i - 1) % 2])
        # Highlight Lives Lost column — highest in orange
        if j == 3:
            val = int(cell_data[i-1][j])
            if val == 146:
                table[i, j].set_facecolor('#F15A22')
                table[i, j].set_text_props(color='white', fontweight='bold')
            elif val == 50:
                table[i, j].set_facecolor('#003366')
                table[i, j].set_text_props(color='white', fontweight='bold')

ax.set_title(
    "Does In-Game Difficulty Predict Post-Survey Accuracy?\n"
    "Mechanic Breakdown by Principle",
    fontsize=13, fontweight='bold', pad=20
)

fig.text(0.5, 0.01,
         "Transparency = easiest game (50 lives lost) but lowest accuracy (67.4%)   |   "
         "Accountability = also easy (69 lives lost) but highest accuracy (79.8%)\n"
         "→ Conceptual salience of the scenario mattered more than mechanical difficulty.",
         ha='center', fontsize=9, style='italic', color='#444444')

plt.tight_layout()
plt.savefig("fig_mechanic_vs_accuracy.png", dpi=150, bbox_inches='tight')
plt.close()
print("Saved: fig_mechanic_vs_accuracy.png")


# ─────────────────────────────────────────────────────────────────────────────
# FIGURE 3 & 4: QUALITATIVE CODING TABLES
# ─────────────────────────────────────────────────────────────────────────────

def make_qual_table(theme_data, title, filename, example_col=True):
    fig, ax = plt.subplots(figsize=(14, len(theme_data) * 1.1 + 1.5))
    ax.axis('off')

    if example_col:
        col_labels = ["Theme", "N", "%", "Example Response"]
        col_widths  = [0.22, 0.05, 0.06, 0.67]
    else:
        col_labels = ["Theme", "N", "%"]
        col_widths  = [0.3, 0.1, 0.1]

    cell_data = []
    for row in theme_data:
        cell_data.append(list(row))

    table = ax.table(
        cellText=cell_data,
        colLabels=col_labels,
        cellLoc='left',
        loc='center',
        colWidths=col_widths
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 2.5)

    # Header
    for j in range(len(col_labels)):
        table[0, j].set_facecolor(UTSA_NAVY)
        table[0, j].set_text_props(color='white', fontweight='bold')

    row_colors = ['#E8EEF5', 'white']
    for i in range(1, len(cell_data) + 1):
        for j in range(len(col_labels)):
            table[i, j].set_facecolor(row_colors[(i - 1) % 2])

    ax.set_title(title, fontsize=13, fontweight='bold', pad=20)
    plt.tight_layout()
    plt.savefig(filename, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Saved: {filename}")


# Q1 themes — deductive coding using Accountability framework
q1_themes = [
    ("Fix / retrain / improve the AI",        57, "65%", '"Reprogram the AI and train it to not make the same mistake again"'),
    ("Accept blame / take accountability",     25, "28%", '"Take accountability for its actions"'),
    ("Shut down / delete the AI",              19, "22%", '"Shut down the AI and train it way more, maybe just delete it"'),
    ("Help / compensate the harmed person",     7,  "8%", '"Find a way to help the person who got harmed and take responsibility"'),
    ("Unclear / minimal / no response",         5,  "6%", '"no time" / "Deal with it"'),
]

make_qual_table(
    q1_themes,
    'Q1 Thematic Coding: "If I were a developer and my AI caused harm, I would..."\n'
    '(N=88; percentages exceed 100% — 12 responses coded into multiple themes)',
    "fig_q1_qualitative.png"
)

# Q2 themes
q2_themes = [
    ("No meaningful change / unclear",              25, "29%", '"it hasn\'t" / "Idk" / "that it can be fun"'),
    ("Training & data quality matters",             18, "21%", '"AI needs lots of training so it does not make big mistakes"'),
    ("Developer responsibility & RAI principles",   15, "18%", '"AI is a reflection of the developer and their code"'),
    ("AI can be harmful / has risks",               15, "18%", '"It can be a lot more harmful than I thought"'),
    ("Privacy / data awareness",                    14, "16%", '"I am more aware of the importance of disclosing AI"'),
]

make_qual_table(
    q2_themes,
    'Q2 Thematic Coding: "After playing Dumb Ways to AI, one way my thinking about AI changed is..."\n'
    '(N=85 with responses; 4 blank)',
    "fig_q2_qualitative.png"
)


# ─────────────────────────────────────────────────────────────────────────────
# TUTORIAL PASS/FAIL → POST-SURVEY ACCURACY (CHI-SQUARE)
# ─────────────────────────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("TUTORIAL PASS/FAIL vs POST-SURVEY ACCURACY")
print("Chi-Square Test of Independence")
print("Null hypothesis: tutorial outcome and post-survey")
print("accuracy are independent for each principle.")
print("=" * 60)

# Parse tutorial pass/fail from sessions.json
# We join on game_score since names were removed from post_df
tutorial_records = []
for session_key, data in all_sessions.items():
    try:
        tuts  = data.get('tutorials', {})
        score = data.get('result', {}).get('finalScore', 0)
        record = {'game_score': score}
        for principle in ['fairness', 'transparency', 'accountability', 'privacy']:
            t = tuts.get(principle, {})
            record[f'tut_{principle}_passed'] = 1 if t.get('passed', False) else 0
        tutorial_records.append(record)
    except Exception:
        continue

tut_df = (pd.DataFrame(tutorial_records)
          .sort_values('game_score', ascending=False)
          .drop_duplicates('game_score')
          .reset_index(drop=True))

# Merge with post survey on game_score
# (post_df needs game_score — load from master if available)
try:
    master = pd.read_csv("master_student_data.csv")
    merged = pd.merge(master[['game_score',
                               's_fairness','s_transparency',
                               's_accountability','s_privacy']],
                      tut_df, on='game_score', how='inner')
    has_merge = len(merged) > 10
except Exception:
    has_merge = False

if not has_merge:
    # Re-score from post_df using game_score from master
    try:
        master = pd.read_csv("master_student_data.csv")
        # Score from master if not already scored
        def find_master_col(kw):
            return [c for c in master.columns if kw.lower() in c.lower()][0]

        PRIVACY_CORRECT_SET = {
            "Deleting user data when it is no longer needed",
            "Only requesting permissions the app needs to function",
            "Being clear about what data is collected and why"
        }
        PRIVACY_WRONG_SET = {
            "Collecting extra data just in case it becomes useful later",
            "Sharing user data with partners without telling users"
        }

        if 's_fairness' not in master.columns:
            master['s_fairness']       = master[find_master_col('Developer Doom')].str.strip().eq('The AI will unfairly favor students similar to those in its training data').astype(int)
            master['s_accountability'] = master[find_master_col('autonomous vehicle')].str.strip().eq('The developer of the autonomous vehicle').astype(int)
            master['s_transparency']   = master[find_master_col('transparency builds')].str.strip().eq('Users can see how decisions are made, spot limitations, and challenge outcomes that seem wrong').astype(int)

            def sp(val):
                if pd.isna(val): return 0
                sel = set(s.strip() for s in str(val).split(","))
                return 1 if (not (sel & PRIVACY_WRONG_SET) and len(sel & PRIVACY_CORRECT_SET) >= 2) else 0
            master['s_privacy'] = master[find_master_col('respecting user privacy')].apply(sp)

        merged = pd.merge(
            master[['game_score','s_fairness','s_transparency','s_accountability','s_privacy']],
            tut_df, on='game_score', how='inner'
        )
        has_merge = len(merged) > 10
    except Exception as e:
        print(f"  Could not merge: {e}")
        has_merge = False

pairs = [
    ('fairness',       's_fairness',       'Fairness'),
    ('transparency',   's_transparency',   'Transparency'),
    ('accountability', 's_accountability', 'Accountability'),
    ('privacy',        's_privacy',        'Privacy'),
]

if has_merge:
    print(f"\nMatched rows for analysis: {len(merged)}\n")
    for tut_key, score_key, label in pairs:
        tut_col = f'tut_{tut_key}_passed'
        if tut_col not in merged.columns or score_key not in merged.columns:
            print(f"\n{label}: columns not found, skipping")
            continue

        sub = merged[[tut_col, score_key]].dropna()
        ct = pd.crosstab(
            sub[tut_col].map({1: 'Tutorial Passed', 0: 'Tutorial Failed'}),
            sub[score_key].map({1: 'Survey Correct', 0: 'Survey Incorrect'}),
            rownames=['Tutorial Outcome'],
            colnames=['Post-Survey']
        )

        n_passed = (sub[tut_col] == 1).sum()
        n_failed = (sub[tut_col] == 0).sum()
        pct_passed_correct = sub[sub[tut_col]==1][score_key].mean() * 100
        pct_failed_correct = sub[sub[tut_col]==0][score_key].mean() * 100

        print(f"--- {label} ---")
        print(ct.to_string())

        if ct.shape == (2, 2) and ct.values.min() > 0:
            chi2, p, dof, expected = chi2_contingency(ct)
            # Check expected cell count assumption
            if (expected < 5).any():
                print(f"  WARNING: Some expected counts < 5. Fisher's exact test may be more appropriate.")
            print(f"  Chi-square statistic: {chi2:.4f}")
            print(f"  P-value: {p:.4f} {'* (significant)' if p < 0.05 else '(not significant)'}")
        else:
            print(f"  [Low variation — cannot compute chi-square]")
            p = None

        print(f"  Tutorial PASSED → {pct_passed_correct:.1f}% got post-survey correct (N={n_passed})")
        print(f"  Tutorial FAILED → {pct_failed_correct:.1f}% got post-survey correct (N={n_failed})")
        print()
else:
    print("\n  [SKIP] Could not merge tutorial data with post-survey scores.")
    print("  Make sure master_student_data.csv is in the same folder.")
    print("  The master CSV needs game_score and the scored survey columns.")


print("\n" + "=" * 60)
print("All done!")
print("Files produced:")
print("  fig_rq2_per_question_breakdown.png")
print("  fig_mechanic_vs_accuracy.png")
print("  fig_q1_qualitative.png")
print("  fig_q2_qualitative.png")
print("=" * 60)