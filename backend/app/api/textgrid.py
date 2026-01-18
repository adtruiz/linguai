"""TextGrid import/export endpoints"""

import re
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()


class Annotation(BaseModel):
    """Single annotation"""
    id: str
    tier: str
    start: float
    end: float
    text: str
    tier_type: str = "interval"  # "interval" or "point"


class TierInfo(BaseModel):
    """Tier metadata"""
    name: str
    tier_type: str  # "interval" or "point"
    xmin: float
    xmax: float


class TextGridImportResponse(BaseModel):
    """Response from TextGrid import"""
    duration: float
    tiers: list[TierInfo]
    annotations: list[Annotation]
    total_annotations: int


def parse_textgrid(content: str) -> dict:
    """
    Parse a Praat TextGrid file (both short and long format).
    Returns structured data with tiers and annotations.
    """
    lines = content.strip().split('\n')

    # Detect format
    is_short_format = 'ooTextFile' not in lines[0] if lines else False

    if is_short_format:
        return parse_textgrid_short(lines)
    else:
        return parse_textgrid_long(lines)


def parse_textgrid_long(lines: list[str]) -> dict:
    """Parse long-format TextGrid"""
    result = {
        "duration": 0,
        "tiers": [],
        "annotations": []
    }

    current_line = 0
    annotation_id = 0

    # Skip header lines until we find xmax
    while current_line < len(lines):
        line = lines[current_line].strip()

        if line.startswith("xmax"):
            match = re.search(r'=\s*([\d.]+)', line)
            if match:
                result["duration"] = float(match.group(1))
            break

        current_line += 1

    current_line += 1

    # Find tiers
    while current_line < len(lines):
        line = lines[current_line].strip()

        # Look for tier item
        if 'item [' in line or 'item[' in line:
            tier_start = current_line
            tier_name = ""
            tier_type = "interval"
            tier_xmin = 0
            tier_xmax = result["duration"]

            # Parse tier header
            while current_line < len(lines):
                line = lines[current_line].strip()

                if 'class = "IntervalTier"' in line:
                    tier_type = "interval"
                elif 'class = "TextTier"' in line:
                    tier_type = "point"
                elif line.startswith('name = "'):
                    tier_name = line.split('"')[1]
                elif line.startswith("xmin"):
                    match = re.search(r'=\s*([\d.]+)', line)
                    if match:
                        tier_xmin = float(match.group(1))
                elif line.startswith("xmax"):
                    match = re.search(r'=\s*([\d.]+)', line)
                    if match:
                        tier_xmax = float(match.group(1))
                elif 'intervals:' in line or 'points:' in line:
                    break

                current_line += 1

            result["tiers"].append(TierInfo(
                name=tier_name,
                tier_type=tier_type,
                xmin=tier_xmin,
                xmax=tier_xmax
            ))

            # Parse intervals/points
            current_line += 1
            while current_line < len(lines):
                line = lines[current_line].strip()

                # Check for next tier
                if 'item [' in line or 'item[' in line:
                    current_line -= 1  # Back up so outer loop sees it
                    break

                # Parse interval/point
                if 'intervals [' in line or 'points [' in line:
                    xmin = 0
                    xmax = 0
                    text = ""

                    current_line += 1
                    while current_line < len(lines):
                        inner_line = lines[current_line].strip()

                        if inner_line.startswith("xmin") or inner_line.startswith("number") or inner_line.startswith("time"):
                            match = re.search(r'=\s*([\d.]+)', inner_line)
                            if match:
                                xmin = float(match.group(1))
                                if tier_type == "point":
                                    xmax = xmin  # Points have same start/end
                        elif inner_line.startswith("xmax"):
                            match = re.search(r'=\s*([\d.]+)', inner_line)
                            if match:
                                xmax = float(match.group(1))
                        elif inner_line.startswith('text = "') or inner_line.startswith('mark = "'):
                            # Handle multi-line text
                            text_match = re.search(r'=\s*"(.*)"$', inner_line)
                            if text_match:
                                text = text_match.group(1)
                            else:
                                # Multi-line text - find closing quote
                                text_start = inner_line.index('"') + 1
                                text = inner_line[text_start:]
                                current_line += 1
                                while current_line < len(lines):
                                    next_line = lines[current_line]
                                    if next_line.rstrip().endswith('"'):
                                        text += '\n' + next_line.rstrip()[:-1]
                                        break
                                    text += '\n' + next_line
                                    current_line += 1
                            break

                        current_line += 1

                    # Only add non-empty annotations
                    if text.strip():
                        annotation_id += 1
                        result["annotations"].append(Annotation(
                            id=str(annotation_id),
                            tier=tier_name,
                            start=xmin,
                            end=xmax,
                            text=text,
                            tier_type=tier_type
                        ))

                current_line += 1

        current_line += 1

    return result


def parse_textgrid_short(lines: list[str]) -> dict:
    """Parse short-format TextGrid"""
    result = {
        "duration": 0,
        "tiers": [],
        "annotations": []
    }

    current_line = 0
    annotation_id = 0

    # Skip File type and Object class if present
    while current_line < len(lines) and (
        lines[current_line].strip().startswith('"') or
        not lines[current_line].strip()
    ):
        current_line += 1

    # xmin
    if current_line < len(lines):
        try:
            result["duration"] = float(lines[current_line + 1].strip())
        except (ValueError, IndexError):
            pass
        current_line += 2

    # Skip <exists> and size
    current_line += 2

    # Parse tiers
    try:
        num_tiers = int(lines[current_line].strip())
        current_line += 1
    except (ValueError, IndexError):
        num_tiers = 0

    for _ in range(num_tiers):
        if current_line >= len(lines):
            break

        # Tier class
        tier_class = lines[current_line].strip().strip('"')
        tier_type = "interval" if "Interval" in tier_class else "point"
        current_line += 1

        # Tier name
        tier_name = lines[current_line].strip().strip('"')
        current_line += 1

        # xmin, xmax
        tier_xmin = float(lines[current_line].strip())
        current_line += 1
        tier_xmax = float(lines[current_line].strip())
        current_line += 1

        result["tiers"].append(TierInfo(
            name=tier_name,
            tier_type=tier_type,
            xmin=tier_xmin,
            xmax=tier_xmax
        ))

        # Number of intervals/points
        num_items = int(lines[current_line].strip())
        current_line += 1

        for _ in range(num_items):
            if current_line >= len(lines):
                break

            if tier_type == "interval":
                xmin = float(lines[current_line].strip())
                current_line += 1
                xmax = float(lines[current_line].strip())
                current_line += 1
            else:  # point
                xmin = float(lines[current_line].strip())
                xmax = xmin
                current_line += 1

            text = lines[current_line].strip().strip('"')
            current_line += 1

            if text.strip():
                annotation_id += 1
                result["annotations"].append(Annotation(
                    id=str(annotation_id),
                    tier=tier_name,
                    start=xmin,
                    end=xmax,
                    text=text,
                    tier_type=tier_type
                ))

    return result


@router.post("/import/textgrid", response_model=TextGridImportResponse)
async def import_textgrid(
    file: UploadFile = File(...),
):
    """
    Import a Praat TextGrid file.
    Supports both long and short formats.
    """
    content = await file.read()

    # Try to decode with different encodings
    text_content = None
    for encoding in ['utf-8', 'utf-16', 'latin-1', 'cp1252']:
        try:
            text_content = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text_content is None:
        raise HTTPException(
            status_code=400,
            detail="Could not decode TextGrid file. Unsupported encoding."
        )

    try:
        parsed = parse_textgrid(text_content)

        return TextGridImportResponse(
            duration=parsed["duration"],
            tiers=parsed["tiers"],
            annotations=parsed["annotations"],
            total_annotations=len(parsed["annotations"])
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse TextGrid: {str(e)}"
        )


class ExportTextGridRequest(BaseModel):
    """Request to export annotations as TextGrid"""
    duration: float
    tiers: list[str]
    annotations: list[Annotation]
    format: str = "long"  # "long" or "short"


@router.post("/export/textgrid")
async def export_textgrid(request: ExportTextGridRequest):
    """
    Export annotations as a Praat TextGrid file.
    Returns the TextGrid content as a string.
    """
    if request.format == "short":
        content = generate_textgrid_short(request)
    else:
        content = generate_textgrid_long(request)

    return {"content": content, "filename": "annotations.TextGrid"}


def generate_textgrid_long(request: ExportTextGridRequest) -> str:
    """Generate long-format TextGrid"""
    lines = [
        'File type = "ooTextFile"',
        'Object class = "TextGrid"',
        '',
        'xmin = 0',
        f'xmax = {request.duration}',
        'tiers? <exists>',
        f'size = {len(request.tiers)}',
        'item []:'
    ]

    for tier_idx, tier_name in enumerate(request.tiers):
        tier_annotations = [a for a in request.annotations if a.tier == tier_name]
        tier_annotations.sort(key=lambda x: x.start)

        # Determine tier type
        tier_type = "IntervalTier"
        if tier_annotations and tier_annotations[0].tier_type == "point":
            tier_type = "TextTier"

        lines.append(f'    item [{tier_idx + 1}]:')
        lines.append(f'        class = "{tier_type}"')
        lines.append(f'        name = "{tier_name}"')
        lines.append('        xmin = 0')
        lines.append(f'        xmax = {request.duration}')

        if tier_type == "IntervalTier":
            lines.append(f'        intervals: size = {len(tier_annotations)}')
            for ann_idx, ann in enumerate(tier_annotations):
                lines.append(f'        intervals [{ann_idx + 1}]:')
                lines.append(f'            xmin = {ann.start}')
                lines.append(f'            xmax = {ann.end}')
                lines.append(f'            text = "{ann.text}"')
        else:
            lines.append(f'        points: size = {len(tier_annotations)}')
            for ann_idx, ann in enumerate(tier_annotations):
                lines.append(f'        points [{ann_idx + 1}]:')
                lines.append(f'            number = {ann.start}')
                lines.append(f'            mark = "{ann.text}"')

    return '\n'.join(lines)


def generate_textgrid_short(request: ExportTextGridRequest) -> str:
    """Generate short-format TextGrid"""
    lines = [
        '"ooTextFile"',
        '"TextGrid"',
        '0',
        str(request.duration),
        '<exists>',
        str(len(request.tiers))
    ]

    for tier_name in request.tiers:
        tier_annotations = [a for a in request.annotations if a.tier == tier_name]
        tier_annotations.sort(key=lambda x: x.start)

        tier_type = "IntervalTier"
        if tier_annotations and tier_annotations[0].tier_type == "point":
            tier_type = "TextTier"

        lines.append(f'"{tier_type}"')
        lines.append(f'"{tier_name}"')
        lines.append('0')
        lines.append(str(request.duration))
        lines.append(str(len(tier_annotations)))

        for ann in tier_annotations:
            if tier_type == "IntervalTier":
                lines.append(str(ann.start))
                lines.append(str(ann.end))
            else:
                lines.append(str(ann.start))
            lines.append(f'"{ann.text}"')

    return '\n'.join(lines)
