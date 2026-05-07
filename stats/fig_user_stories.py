"""
User Story Comparison Table Figure
====================================
Generates a publication-ready side-by-side table comparing
the Green and Red student profiles for the Results section.

Run from your stats folder.
Output: fig_user_story_table.png
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

UTSA_NAVY   = "#003366"
UTSA_ORANGE = "#F15A22"
GREEN_DARK  = "#1a6b3c"
GREEN_LIGHT = "#e8f4ee"
RED_DARK    = "#8B2000"
RED_LIGHT   = "#fdf0ec"
GRAY_LIGHT  = "#f5f5f5"
WHITE       = "#ffffff"

# ── Data ──────────────────────────────────────────────────────────────────────

rows = [
    ("Attitude toward AI\n(pre-survey)",
     "Somewhat agree AI is positive\nStrongly agree worried about bias\nSomewhat agree excited for careers\n(Avg: 4.33 / 5.0)",
     "Somewhat agree AI is positive\nNeither agree nor disagree re: bias\nNeither agree nor disagree re: careers\n(Avg: 3.33 / 5.0)"),

    ("RAI Knowledge\n(pre-survey)",
     "Incorrect — answered Transparency",
     "Incorrect — answered Privacy"),

    ("RAI Knowledge\n(post-survey)",
     "Correct — answered Friendly ✓",
     "Correct — answered Friendly ✓"),

    ("Learning Outcome",
     "LO = 1  (Wrong → Right)",
     "LO = 1  (Wrong → Right)"),

    ("Rounds played",
     "22 rounds",
     "18 rounds"),

    ("Challenge pass rate",
     "81.8%",
     "77.8%"),

    ("Highest difficulty\nreached",
     "Impossible",
     "Impossible"),

    ("\"If my AI caused\nharm, I would...\"",
     "\"Shut down the AI and train it\nway more, maybe just delete it\ndepending on how bad it was.\"",
     "\"Turn it off for good.\""),

    ("\"One way my\nthinking changed...\"",
     "\"AI isn't always good — it can\nbe bad and we need to limit\nthe amount of data it gets.\"",
     "\"AI isn't all bad, you just need\nto teach it the right stuff.\""),
]

# ── Figure setup ──────────────────────────────────────────────────────────────

n_rows = len(rows)
fig_h  = 1.0 + n_rows * 1.05
fig, ax = plt.subplots(figsize=(13, fig_h))
ax.axis('off')

col_widths = [0.24, 0.38, 0.38]   # label | green | red
x_starts   = [0.0,  0.24, 0.62]
y_start    = 0.97
row_h      = 1.0 / (n_rows + 1.5)

def draw_cell(ax, x, y, w, h, text, bg, text_color='#111111',
              bold=False, fontsize=8.5, valign='center'):
    rect = mpatches.FancyBboxPatch(
        (x + 0.003, y - h + 0.004), w - 0.006, h - 0.008,
        boxstyle="round,pad=0.005",
        linewidth=0.5, edgecolor='#cccccc',
        facecolor=bg, transform=ax.transAxes, clip_on=False
    )
    ax.add_patch(rect)
    ax.text(
        x + w / 2, y - h / 2,
        text,
        transform=ax.transAxes,
        ha='center', va=valign,
        fontsize=fontsize,
        fontweight='bold' if bold else 'normal',
        color=text_color,
        wrap=True,
        multialignment='center',
        linespacing=1.4
    )

# ── Header row ────────────────────────────────────────────────────────────────

header_y = y_start
header_h = row_h * 0.9

draw_cell(ax, x_starts[0], header_y, col_widths[0], header_h,
          "Profile Dimension", UTSA_NAVY, 'white', bold=True, fontsize=9)
draw_cell(ax, x_starts[1], header_y, col_widths[1], header_h,
          "Student A\n(Positive Attitude, LO = 1)",
          GREEN_DARK, 'white', bold=True, fontsize=9)
draw_cell(ax, x_starts[2], header_y, col_widths[2], header_h,
          "Student B\n(Mixed Attitude, LO = 1)",
          RED_DARK, 'white', bold=True, fontsize=9)

# ── Data rows ─────────────────────────────────────────────────────────────────

for i, (label, green_val, red_val) in enumerate(rows):
    y = header_y - header_h - i * row_h
    bg_label = GRAY_LIGHT if i % 2 == 0 else WHITE
    bg_green = GREEN_LIGHT if i % 2 == 0 else WHITE
    bg_red   = RED_LIGHT   if i % 2 == 0 else WHITE

    # Highlight LO row
    if 'Learning Outcome' in label:
        bg_green = "#c8e6c9"
        bg_red   = "#c8e6c9"

    # Highlight open-ended rows
    if 'thinking changed' in label or 'caused harm' in label:
        fontsize_val = 8.0
    else:
        fontsize_val = 8.5

    draw_cell(ax, x_starts[0], y, col_widths[0], row_h,
              label, bg_label, bold=True, fontsize=8.5)
    draw_cell(ax, x_starts[1], y, col_widths[1], row_h,
              green_val, bg_green, fontsize=fontsize_val)
    draw_cell(ax, x_starts[2], y, col_widths[2], row_h,
              red_val, bg_red, fontsize=fontsize_val)

# ── Title and caption ─────────────────────────────────────────────────────────

ax.text(0.5, y_start + 0.04,
        "Table 1. User Story Profiles: Two Students' Engagement with Dumb Ways to AI",
        transform=ax.transAxes, ha='center', va='bottom',
        fontsize=11, fontweight='bold', color='#111111')

ax.text(0.5, -0.01,
        "LO = Learning Outcome (1 = incorrect pre-survey → correct post-survey). "
        "Student names anonymized per IRB protocol.",
        transform=ax.transAxes, ha='center', va='top',
        fontsize=7.5, color='#555555', style='italic')

plt.tight_layout(pad=0.5)
plt.savefig("fig_user_story_table.png", dpi=180, bbox_inches='tight',
            facecolor='white')
plt.close()
print("Saved: fig_user_story_table.png")