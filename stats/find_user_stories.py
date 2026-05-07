"""
User Story Candidate Finder
============================
Finds two contrasting student profiles for the Results section:

  GREEN student: Positive attitude toward AI going in + showed learning
                 (pre wrong, post correct) + high game engagement

  RED student:   Skeptical/negative attitude toward AI going in
                 + any learning outcome (the contrast is the interesting part)

Outputs:
  - Printed profiles for the top 3 candidates in each group
  - user_story_candidates.xlsx with full data for each candidate

Run from your stats folder alongside master_student_data.csv and sessions.json
"""

import json
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# ─────────────────────────────────────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────────────────────────────────────

master = pd.read_csv("master_student_data.csv")

with open("sessions.json") as f:
    all_sessions = json.load(f)

print(f"Master rows: {len(master)}")
print(f"Columns available: {len(master.columns)}")

# ─────────────────────────────────────────────────────────────────────────────
# FIND RELEVANT COLUMNS
# ─────────────────────────────────────────────────────────────────────────────

def find_col(df, keyword):
    matches = [c for c in df.columns if keyword.lower() in c.lower()]
    return matches[0] if matches else None

# Key columns
resp_id_col    = find_col(master, 'Response ID')
first_name_col = find_col(master, 'First name')
last_name_col  = find_col(master, 'Last name')
match_name_col = find_col(master, 'match_name')

# Attitude columns (pre-survey)
att1_col = find_col(master, 'positively impact')   # AI positive impact
att2_col = find_col(master, 'worried about bias')  # worried about bias
att3_col = find_col(master, 'excited about')       # excited for careers

# Pre/post RAI question
pre_col  = find_col(master, 'NOT a principle of Responsible AI?_pre')
post_col = find_col(master, 'NOT a principle of Responsible AI?_post')

# Gameplay columns
rounds_col     = find_col(master, 'total_rounds_played')
score_col      = find_col(master, 'game_score')
difficulty_col = find_col(master, 'highest_difficulty_reached')
pass_rate_col  = find_col(master, 'challenge_pass_rate')
growth_col     = find_col(master, 'Growth')

# Open-ended post columns
harm_col       = find_col(master, 'my AI caused harm')
thinking_col   = find_col(master, 'one way my thinking')

print(f"\nKey columns found:")
print(f"  Response ID:    {resp_id_col}")
print(f"  First name:     {first_name_col}")
print(f"  Last name:      {last_name_col}")
print(f"  Match name:     {match_name_col}")
print(f"  Attitude 1:     {att1_col[:50] if att1_col else None}")
print(f"  Pre RAI:        {pre_col}")
print(f"  Post RAI:       {post_col}")
print(f"  Rounds played:  {rounds_col}")
print(f"  Game score:     {score_col}")
print(f"  Pass rate:      {pass_rate_col}")

# ─────────────────────────────────────────────────────────────────────────────
# SCORE VARIABLES
# ─────────────────────────────────────────────────────────────────────────────

LIKERT_MAP = {
    'Strongly agree':              5,
    'Somewhat agree':              4,
    'Neither agree nor disagree':  3,
    'Somewhat disagree':           2,
    'Strongly disagree':           1,
}

def score_likert(val):
    if pd.isna(val): return np.nan
    return LIKERT_MAP.get(str(val).strip(), np.nan)

# Attitude scores (1-5, higher = more positive/worried/excited)
if att1_col: master['att_positive'] = master[att1_col].apply(score_likert)
if att2_col: master['att_bias']     = master[att2_col].apply(score_likert)
if att3_col: master['att_career']   = master[att3_col].apply(score_likert)

# Average attitude score across all 3 items
att_cols_scored = [c for c in ['att_positive','att_bias','att_career']
                   if c in master.columns]
master['avg_attitude'] = master[att_cols_scored].mean(axis=1)

# Learning outcome (wrong → right on matched question)
CORRECT = 'Friendly'
if pre_col and post_col:
    master['pre_correct']  = master[pre_col].str.strip().eq(CORRECT).astype(int)
    master['post_correct'] = master[post_col].str.strip().eq(CORRECT).astype(int)
    master['learned']      = ((master['pre_correct'] == 0) &
                               (master['post_correct'] == 1)).astype(int)
    master['forgot']       = ((master['pre_correct'] == 1) &
                               (master['post_correct'] == 0)).astype(int)
    master['already_knew'] = ((master['pre_correct'] == 1) &
                               (master['post_correct'] == 1)).astype(int)
else:
    print("  WARNING: Could not find pre/post RAI columns")
    master['learned'] = 0

# Normalize rounds
if rounds_col:
    master['rounds'] = pd.to_numeric(master[rounds_col], errors='coerce')
else:
    master['rounds'] = np.nan

if score_col:
    master['g_score'] = pd.to_numeric(master[score_col], errors='coerce')
else:
    master['g_score'] = np.nan

if pass_rate_col:
    master['pass_rate'] = pd.to_numeric(master[pass_rate_col], errors='coerce')
else:
    master['pass_rate'] = np.nan

# ─────────────────────────────────────────────────────────────────────────────
# DEFINE GREEN AND RED GROUPS
# ─────────────────────────────────────────────────────────────────────────────

# GREEN: High attitude (avg >= 4 = Somewhat/Strongly agree on all 3)
#        AND learned (wrong → right)
#        AND high engagement (top half of rounds played)
median_rounds = master['rounds'].median()

green_mask = (
    (master['avg_attitude'] >= 4.0) &
    (master['learned'] == 1) &
    (master['rounds'] >= median_rounds)
)

# RED: Low attitude (avg <= 2.5 = Somewhat/Strongly disagree dominant)
#      AND still learned (wrong → right) despite skepticism
#      This supports the claim that the game works across attitude profiles
red_mask = (
    (master['avg_attitude'] <= 2.5) &
    (master['learned'] == 1)
)

green_df = master[green_mask].copy()
red_df   = master[red_mask].copy()

print(f"\nGreen candidates (positive attitude + learned + high engagement): {len(green_df)}")
print(f"Red candidates   (skeptical/negative attitude):                    {len(red_df)}")

# If too few green candidates, relax the engagement requirement
if len(green_df) < 3:
    green_mask2 = (master['avg_attitude'] >= 4.0) & (master['learned'] == 1)
    green_df = master[green_mask2].copy()
    print(f"  Relaxed green (no engagement requirement): {len(green_df)}")

# If still too few, just take high attitude + learned
if len(green_df) < 1:
    green_mask3 = (master['avg_attitude'] >= 3.5) & (master['learned'] == 1)
    green_df = master[green_mask3].copy()
    print(f"  Further relaxed green: {len(green_df)}")

# Sort green by attitude score then rounds played
green_df = green_df.sort_values(
    ['avg_attitude', 'rounds', 'g_score'],
    ascending=[False, False, False]
).reset_index(drop=True)

# If no red candidates meet both criteria, relax attitude threshold
if len(red_df) < 1:
    red_mask2 = (master['avg_attitude'] <= 3.0) & (master['learned'] == 1)
    red_df = master[red_mask2].copy()
    print(f"  Relaxed red threshold to avg <= 3.0: {len(red_df)} candidates")

# If still none, just take lowest attitude students who learned
if len(red_df) < 1:
    red_df = master[master['learned'] == 1].copy()
    print(f"  Further relaxed: all learners ranked by attitude")

# Sort red by attitude score (most negative first) then by rounds played
red_df = red_df.sort_values(
    ['avg_attitude', 'rounds'],
    ascending=[True, False]
).reset_index(drop=True)

# ─────────────────────────────────────────────────────────────────────────────
# PRINT CANDIDATE PROFILES
# ─────────────────────────────────────────────────────────────────────────────

def print_profile(row, label):
    name = ''
    if first_name_col and not pd.isna(row.get(first_name_col, '')):
        name = str(row.get(first_name_col, ''))
    if last_name_col and not pd.isna(row.get(last_name_col, '')):
        name += ' ' + str(row.get(last_name_col, ''))
    if not name.strip() and match_name_col:
        name = str(row.get(match_name_col, 'Unknown'))

    resp_id = row.get(resp_id_col, 'N/A') if resp_id_col else 'N/A'

    print(f"\n  {'='*55}")
    print(f"  {label}")
    print(f"  {'='*55}")
    print(f"  Name:            {name.strip()}")
    print(f"  Response ID:     {resp_id}")
    print(f"  Avg Attitude:    {row.get('avg_attitude', 'N/A'):.2f} / 5.0")

    if att1_col: print(f"    AI positive:   {row.get(att1_col, 'N/A')}")
    if att2_col: print(f"    Worried bias:  {row.get(att2_col, 'N/A')}")
    if att3_col: print(f"    Career excite: {row.get(att3_col, 'N/A')}")

    pre_ans  = row.get(pre_col,  'N/A') if pre_col  else 'N/A'
    post_ans = row.get(post_col, 'N/A') if post_col else 'N/A'
    print(f"  Pre RAI answer:  {pre_ans}  ({'correct' if str(pre_ans).strip()==CORRECT else 'incorrect'})")
    print(f"  Post RAI answer: {post_ans}  ({'correct' if str(post_ans).strip()==CORRECT else 'incorrect'})")
    print(f"  Learned (LO=1):  {'YES' if row.get('learned',0)==1 else 'NO'}")
    print(f"  Rounds played:   {row.get('rounds', 'N/A')}")
    print(f"  Game score:      {row.get('g_score', 'N/A')}")
    print(f"  Pass rate:       {row.get('pass_rate', 'N/A')}%")
    print(f"  Difficulty:      {row.get(difficulty_col, 'N/A') if difficulty_col else 'N/A'}")

    if harm_col:
        harm_ans = row.get(harm_col, '')
        if not pd.isna(harm_ans) and harm_ans:
            print(f"  'If my AI caused harm...': {str(harm_ans)[:120]}")

    if thinking_col:
        think_ans = row.get(thinking_col, '')
        if not pd.isna(think_ans) and think_ans:
            print(f"  'My thinking changed...':  {str(think_ans)[:120]}")


print("\n" + "=" * 60)
print("GREEN STUDENT CANDIDATES")
print("(Positive attitude + Learned + High engagement)")
print("=" * 60)

for i in range(min(3, len(green_df))):
    print_profile(green_df.iloc[i], f"GREEN CANDIDATE #{i+1}")

print("\n" + "=" * 60)
print("RED STUDENT CANDIDATES")
print("(Skeptical/Negative attitude toward AI)")
print("=" * 60)

for i in range(min(3, len(red_df))):
    print_profile(red_df.iloc[i], f"RED CANDIDATE #{i+1}")

# ─────────────────────────────────────────────────────────────────────────────
# EXPORT TO EXCEL
# ─────────────────────────────────────────────────────────────────────────────

story_cols = [
    resp_id_col, first_name_col, last_name_col, match_name_col,
    att1_col, att2_col, att3_col,
    'avg_attitude', 'pre_correct', 'post_correct', 'learned',
    'rounds', 'g_score', 'pass_rate', difficulty_col,
    harm_col, thinking_col
]
story_cols = [c for c in story_cols if c and c in master.columns]

with pd.ExcelWriter("user_story_candidates.xlsx", engine="openpyxl") as writer:
    green_df[story_cols].head(5).to_excel(
        writer, sheet_name="Green Candidates", index=False)
    red_df[story_cols].head(5).to_excel(
        writer, sheet_name="Red Candidates", index=False)
    master[story_cols].sort_values('avg_attitude').to_excel(
        writer, sheet_name="All Students Ranked", index=False)

print("\n\nSaved: user_story_candidates.xlsx")
print("  Sheet 1: Green Candidates (top 5)")
print("  Sheet 2: Red Candidates (top 5)")
print("  Sheet 3: All Students Ranked by attitude (lowest to highest)")