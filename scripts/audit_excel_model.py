#!/usr/bin/env python3
"""Read-only OOXML audit helper for the residential quote workbook.

Uses only Python's standard library so the workbook can be inspected without
opening Excel, executing VBA, or changing the source file.
"""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
DOC_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
CELL_REF_RE = re.compile(
    r"(?:(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_. ]*))!)?"
    r"(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?"
)


def qtext(node: ET.Element | None) -> str:
    if node is None:
        return ""
    return "".join(part.text or "" for part in node.iter() if part.tag.endswith("}t"))


def a1_key(ref: str) -> tuple[int, int]:
    match = re.fullmatch(r"\$?([A-Z]+)\$?(\d+)", ref)
    if not match:
        return (10**9, 10**9)
    col = 0
    for char in match.group(1):
        col = col * 26 + ord(char) - 64
    return int(match.group(2)), col


def decode_cell(cell: ET.Element, shared: list[str]) -> tuple[object, str | None]:
    formula = cell.find("m:f", NS)
    value = cell.find("m:v", NS)
    inline = cell.find("m:is", NS)
    kind = cell.attrib.get("t")
    raw = value.text if value is not None else None
    if kind == "s" and raw is not None:
        parsed: object = shared[int(raw)]
    elif kind == "inlineStr":
        parsed = qtext(inline)
    elif kind == "str":
        parsed = raw or ""
    elif kind == "b":
        parsed = raw == "1"
    elif raw is None:
        parsed = None
    else:
        try:
            parsed = float(raw)
            if parsed.is_integer():
                parsed = int(parsed)
        except ValueError:
            parsed = raw
    return parsed, formula.text if formula is not None else None


def load_model(path: Path) -> dict:
    with zipfile.ZipFile(path) as book:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in book.namelist():
            root = ET.fromstring(book.read("xl/sharedStrings.xml"))
            shared = [qtext(item) for item in root.findall("m:si", NS)]

        rel_root = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
        rels = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in rel_root.findall("r:Relationship", REL_NS)
        }
        wb_root = ET.fromstring(book.read("xl/workbook.xml"))
        sheets: dict[str, dict] = {}
        for sheet in wb_root.find("m:sheets", NS) or []:
            name = sheet.attrib["name"]
            target = rels[sheet.attrib[DOC_REL]]
            xml_path = "xl/" + target.lstrip("/")
            root = ET.fromstring(book.read(xml_path))
            cells: dict[str, dict] = {}
            for cell in root.findall(".//m:sheetData/m:row/m:c", NS):
                value, formula = decode_cell(cell, shared)
                cells[cell.attrib["r"]] = {
                    "value": value,
                    "formula": formula,
                    "style": int(cell.attrib.get("s", "0")),
                    "type": cell.attrib.get("t"),
                }
            validations = []
            for validation in root.findall(".//m:dataValidations/m:dataValidation", NS):
                validations.append(
                    {
                        "range": validation.attrib.get("sqref"),
                        "type": validation.attrib.get("type"),
                        "operator": validation.attrib.get("operator"),
                        "formula1": (validation.findtext("m:formula1", default="", namespaces=NS)),
                        "formula2": (validation.findtext("m:formula2", default="", namespaces=NS)),
                    }
                )
            dimension = root.find("m:dimension", NS)
            sheets[name] = {
                "state": sheet.attrib.get("state", "visible"),
                "dimension": dimension.attrib.get("ref") if dimension is not None else None,
                "cells": cells,
                "validations": validations,
            }

        defined_names = []
        for item in wb_root.findall(".//m:definedNames/m:definedName", NS):
            defined_names.append(
                {
                    "name": item.attrib.get("name"),
                    "scope_index": item.attrib.get("localSheetId"),
                    "hidden": item.attrib.get("hidden") == "1",
                    "formula": item.text or "",
                }
            )

        return {"sheets": sheets, "defined_names": defined_names}


def references(formula: str, current_sheet: str) -> list[tuple[str, str, str | None]]:
    refs = []
    for match in CELL_REF_RE.finditer(formula):
        quoted, bare, start, end = match.groups()
        sheet = (quoted or bare or current_sheet).replace("''", "'")
        if sheet.startswith("[") or "[" in sheet:
            continue
        refs.append((sheet.strip(), start.replace("$", ""), end.replace("$", "") if end else None))
    return refs


def make_summary(model: dict) -> dict:
    sheets = model["sheets"]
    inbound: Counter[tuple[str, str]] = Counter()
    cross_sheet: Counter[tuple[str, str]] = Counter()
    formula_functions: Counter[str] = Counter()
    external_formulas = []
    error_formulas = []

    for sheet_name, sheet in sheets.items():
        for ref, cell in sheet["cells"].items():
            formula = cell["formula"]
            if not formula:
                continue
            if "[" in formula:
                external_formulas.append({"sheet": sheet_name, "cell": ref, "formula": formula})
            if "#REF!" in formula or "#NAME?" in formula:
                error_formulas.append({"sheet": sheet_name, "cell": ref, "formula": formula})
            for fn in re.findall(r"(?<![A-Z0-9_.])([A-Z][A-Z0-9_.]+)\s*\(", formula.upper()):
                formula_functions[fn] += 1
            for target_sheet, start, end in references(formula, sheet_name):
                inbound[(target_sheet, start)] += 1
                if target_sheet != sheet_name:
                    cross_sheet[(sheet_name, target_sheet)] += 1
                if end and end != start:
                    inbound[(target_sheet, end)] += 1

    candidates = []
    for (sheet_name, ref), count in inbound.most_common():
        sheet = sheets.get(sheet_name)
        if not sheet:
            continue
        cell = sheet["cells"].get(ref)
        if not cell or cell["formula"] or cell["value"] is None:
            continue
        row, col = a1_key(ref)
        neighbors = []
        for delta in range(1, 4):
            for candidate_ref, candidate_cell in sheet["cells"].items():
                c_row, c_col = a1_key(candidate_ref)
                if c_row == row and c_col == col - delta and isinstance(candidate_cell["value"], str):
                    neighbors.append(candidate_cell["value"])
        candidates.append(
            {
                "sheet": sheet_name,
                "cell": ref,
                "value": cell["value"],
                "references": count,
                "left_labels": neighbors[:3],
                "style": cell["style"],
            }
        )

    sheet_summary = []
    for name, sheet in sheets.items():
        formula_count = sum(1 for c in sheet["cells"].values() if c["formula"])
        value_count = sum(1 for c in sheet["cells"].values() if c["value"] is not None)
        sheet_summary.append(
            {
                "name": name,
                "state": sheet["state"],
                "dimension": sheet["dimension"],
                "values": value_count,
                "formulas": formula_count,
                "validations": sheet["validations"],
            }
        )

    return {
        "sheets": sheet_summary,
        "candidate_inputs": candidates,
        "cross_sheet_edges": [
            {"from": source, "to": target, "references": count}
            for (source, target), count in cross_sheet.most_common()
        ],
        "formula_functions": dict(formula_functions.most_common()),
        "external_formulas": external_formulas,
        "error_formulas": error_formulas,
        "defined_names": model["defined_names"],
    }


def sheet_dump(model: dict, name: str, include_blank: bool = False) -> list[dict]:
    sheet = model["sheets"].get(name)
    if sheet is None:
        raise SystemExit(f"Unknown sheet: {name}")
    rows = []
    for ref, cell in sorted(sheet["cells"].items(), key=lambda item: a1_key(item[0])):
        if include_blank or cell["value"] is not None or cell["formula"]:
            rows.append({"cell": ref, **cell})
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--sheet")
    parser.add_argument("--summary", action="store_true")
    parser.add_argument("--include-blank", action="store_true")
    args = parser.parse_args()
    model = load_model(args.workbook)
    if args.sheet:
        result = sheet_dump(model, args.sheet, args.include_blank)
    else:
        result = make_summary(model)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
