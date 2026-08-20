#!/usr/bin/env python3
"""Minimal reader for NeuroInspector project packs (neuroinspector-project/v1).

Usage:
  python scripts/read_project_pack.py examples/example.neuroinspector.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2

    path = Path(argv[1])
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("format") != "neuroinspector-project/v1":
        raise SystemExit(f"Unexpected format: {data.get('format')!r}")

    src = data["sourceFile"]
    print(f"format:        {data['format']}")
    print(f"exported_at:   {data.get('exportedAt')}")
    print(f"source_name:   {src['name']}")
    print(f"source_bytes:  {src['sizeBytes']}")
    print(f"source_sha256: {src['sha256']}")
    print(f"selected:      {len(data.get('selectedPaths', []))}")
    for p in data.get("selectedPaths", []):
        print(f"  - {p}")
    print(f"annotations:   {len(data.get('annotations', []))}")
    for a in data.get("annotations", []):
        note = (a.get("note") or "").replace("\n", " ")
        print(f"  - {a.get('path')}: {note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
