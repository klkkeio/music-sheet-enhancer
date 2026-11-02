# Music Sheet Enhancer - Data Schema Guide

This document describes how to structure custom note reading exercises for the `music-sheet-enhancer` engine.

---

## Exercise JSON Format

Exercises are defined in a JSON array. Each element in the array represents one exercise stave system.

```json
[
  {
    "id": 1,
    "clef": "treble",
    "category": "lines",
    "notes": [
      { "key": "e/4", "letter": "E", "solfege": "mi" },
      { "key": "g/4", "letter": "G", "solfege": "sol" },
      { "key": "b/4", "letter": "B", "solfege": "si" }
    ]
  }
]
```

### Top-Level Fields

| Field | Type | Required | Description |
|:---|:---|:---:|:---|
| `id` | Integer | Yes | Exercise number (1, 2, 3...) |
| `clef` | String | Yes | `"treble"` or `"bass"` |
| `category` | String | No | `"lines"`, `"spaces"`, or `"mixed"` |
| `title` | String | No | Custom exercise title override (defaults to localized string) |
| `subtitle` | String | No | Custom subtitle override |
| `notes` | Array | Yes | Array of note objects (at least 1 note required) |

### Note Object Fields

| Field | Type | Required | Description | Example |
|:---|:---|:---:|:---|:---|
| `key` | String | Yes | Scientific pitch in VexFlow format (`step/octave`) | `"c/4"`, `"f#/5"`, `"bb/3"` |
| `letter` | String | Yes | Note letter name displayed on answer keys | `"C"`, `"F#"`, `"Bb"` |
| `solfege` | String | No | Solfège syllable displayed on answer keys | `"do"`, `"fa"`, `"si"` |

---

## Pitch Reference Guide

### Treble Clef (高音譜號 / 右手)
- **Lines (bottom to top):**
  - Line 1: `e/4` (E / mi)
  - Line 2: `g/4` (G / sol)
  - Line 3: `b/4` (B / si)
  - Line 4: `d/5` (D / re)
  - Line 5: `f/5` (F / fa)
- **Spaces (bottom to top):**
  - Space 1: `f/4` (F / fa)
  - Space 2: `a/4` (A / la)
  - Space 3: `c/5` (C / do)
  - Space 4: `e/5` (E / mi)

### Bass Clef (低音譜號 / 左手)
- **Lines (bottom to top):**
  - Line 1: `g/2` (G / sol)
  - Line 2: `b/2` (B / si)
  - Line 3: `d/3` (D / re)
  - Line 4: `f/3` (F / fa)
  - Line 5: `a/3` (A / la)
- **Spaces (bottom to top):**
  - Space 1: `a/2` (A / la)
  - Space 2: `c/3` (C / do)
  - Space 3: `e/3` (E / mi)
  - Space 4: `g/3` (G / sol)
