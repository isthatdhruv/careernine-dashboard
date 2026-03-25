#!/usr/bin/env python3
"""
Replace personality words in ai_cache JSON files and Excel input files.
Replaces: Realistic -> Thinker, Investigative -> Doer (case-insensitive)
Works on both English and Hindi pipelines.
"""

import json
import re
import argparse
from pathlib import Path

import pandas as pd

REPLACEMENTS = {
    "realistic": "Doer",
    "investigative": "Thinker",
}


def replace_words(text):
    if not isinstance(text, str):
        return text
    for old, new in REPLACEMENTS.items():
        text = re.sub(old, new, text, flags=re.IGNORECASE)
    return text


def process_cache(cache_dir):
    cache_path = Path(cache_dir)
    if not cache_path.exists():
        print(f"  Cache directory not found: {cache_dir}")
        return 0
    files = list(cache_path.glob("*.json"))
    updated = 0
    for f in files:
        try:
            data = json.loads(f.read_text())
        except Exception:
            continue
        changed = False
        for key in ("ai_summary", "learning_style_summary"):
            if key in data and isinstance(data[key], str):
                new_val = replace_words(data[key])
                if new_val != data[key]:
                    data[key] = new_val
                    changed = True
        if changed:
            f.write_text(json.dumps(data, ensure_ascii=False, indent=2))
            updated += 1
    print(f"  Updated {updated}/{len(files)} cache files in {cache_dir}")
    return updated


def process_excel(excel_path, sheet_name="suitability_index"):
    path = Path(excel_path)
    if not path.exists():
        print(f"  Excel file not found: {excel_path}")
        return 0
    df = pd.read_excel(path, sheet_name=sheet_name)
    updated = 0
    for col in ("AI_Summary", "Learning_Style_Summary"):
        if col not in df.columns:
            continue
        for idx, val in df[col].items():
            if not isinstance(val, str):
                continue
            new_val = replace_words(val)
            if new_val != val:
                df.at[idx, col] = new_val
                updated += 1
    if updated > 0:
        with pd.ExcelWriter(path, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    print(f"  Updated {updated} cells in {excel_path} [{sheet_name}]")
    return updated


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Replace Realistic->Thinker, Investigative->Doer in AI summaries")
    parser.add_argument("--pipeline", choices=["english", "hindi", "both"], default="both")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing")
    args = parser.parse_args()

    pipelines = []
    if args.pipeline in ("english", "both"):
        pipelines.append("report-gen-english")
    if args.pipeline in ("hindi", "both"):
        pipelines.append("report-gen-hindi")

    if args.dry_run:
        print("DRY RUN - no files will be modified\n")

    for pipeline in pipelines:
        print(f"\nProcessing {pipeline}...")
        cache_dir = Path(pipeline) / "ai_cache"
        excel_path = Path(pipeline) / "input.xlsx"

        if args.dry_run:
            cache_path = Path(cache_dir)
            if cache_path.exists():
                count = 0
                for f in cache_path.glob("*.json"):
                    try:
                        data = json.loads(f.read_text())
                    except Exception:
                        continue
                    for key in ("ai_summary", "learning_style_summary"):
                        if key in data and isinstance(data[key], str):
                            if replace_words(data[key]) != data[key]:
                                count += 1
                                break
                print(f"  Would update {count} cache files in {cache_dir}")
        else:
            process_cache(cache_dir)
            process_excel(excel_path)

    print("\nDone.")
