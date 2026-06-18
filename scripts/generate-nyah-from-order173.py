#!/usr/bin/env python3
"""Generate NYAH accounts from Фармоиши №173 (moliya-515.pdf extract)."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTRACT = ROOT / "scripts/nyah-source/moliya-515-extract.txt"
OUT_JSON = ROOT / "src/data/nyah-accounts-full.json"
OUT_TS = ROOT / "src/data/nyah-accounts-full.ts"

BALANCE_BY_CLASS = {
    "1": "active",
    "2": "passive",
    "3": "passive",
    "4": "passive",
    "5": "active",
    "6": "active-passive",
    "7": "active-passive",
}

FORM3_CODES = {
    "1 31 100",
    "1 31 210",
    "1 31 211",
    "1 31 212",
    "1 31 213",
    "1 31 214",
    "1 31 215",
    "1 31 216",
    "1 31 217",
    "1 31 218",
    "1 31 219",
    "1 31 000",
}

FORM14_CODES = {
    "1 41 100",
    "1 41 110",
    "1 41 210",
    "1 41 220",
    "1 41 300",
    "1 41 310",
    "1 41 400",
    "1 41 500",
    "1 44 000",
    "1 46 000",
    "1 47 000",
    "1 49 000",
    "1 51 500",
}


def normalize_name(name: str) -> str:
    name = re.sub(r"\s+", " ", name).strip(" -")
    # PDF extraction often glues words — insert space before capital after lowercase Tajik
    name = re.sub(r"([а-яёӣӯҳқғҷҳА-ЯЁӢӮҲҚҒҶҲа-я])([А-ЯЁӢӮҲҚҒҶҲ])", r"\1 \2", name)
    return name


def parse_accounts(text: str) -> list[dict[str, str]]:
    start = text.find("    1 00 000")
    end = text.find("(150)")
    chunk = text[start:end] if start >= 0 and end > start else text

    line_pat = re.compile(r"([1-7])\s+(\d{2})\s+(\d{3})")
    accounts: list[dict[str, str]] = []
    seen: set[str] = set()

    for raw in chunk.splitlines():
        line = raw.strip()
        if not line:
            continue
        # Strip GFS reference prefix (4+ digits), not account class digit
        line = re.sub(r"^\d{4,}\s+", "", line)
        match = line_pat.search(line)
        if not match:
            continue

        class_id, group, sub = match.groups()
        code = f"{class_id} {group} {sub}"
        if code in seen:
            continue

        name = normalize_name(line[match.end() :])
        if not name or "Қисми" in name or name.startswith("("):
            continue
        if len(name) < 3:
            continue

        seen.add(code)
        item: dict[str, str] = {
            "code": code,
            "classId": class_id,
            "name": name,
            "balanceType": BALANCE_BY_CLASS[class_id],
            "group": f"{class_id} {group}",
        }
        if code in FORM3_CODES:
            item["form3Row"] = "—"
        if code in FORM14_CODES:
            item["form14Row"] = "—"
        accounts.append(item)

    accounts.sort(key=lambda item: item["code"])
    return accounts


def emit_typescript(accounts: list[dict[str, str]]) -> str:
    return ""  # JSON-only; see src/data/nyah-accounts-full.ts wrapper


def main() -> None:
    text = EXTRACT.read_text(encoding="utf-8")
    accounts = parse_accounts(text)
    OUT_JSON.write_text(json.dumps(accounts, ensure_ascii=False, indent=2), encoding="utf-8")
    counts = Counter(item["classId"] for item in accounts)
    print(f"Wrote {len(accounts)} accounts to {OUT_JSON.name}")
    print("By class:", dict(sorted(counts.items())))


if __name__ == "__main__":
    main()
