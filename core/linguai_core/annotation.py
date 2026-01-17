"""
Annotation data structures for time-aligned linguistic analysis.

Supports TextGrid format (Praat) and ELAN XML interoperability.
"""

from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path
import json
import uuid


@dataclass
class Annotation:
    """A single time-aligned annotation segment."""
    start: float  # Start time in seconds
    end: float    # End time in seconds
    text: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def __post_init__(self):
        if self.start < 0:
            raise ValueError("Start time cannot be negative")
        if self.end < self.start:
            raise ValueError("End time must be >= start time")

    @property
    def duration(self) -> float:
        """Duration of the annotation in seconds."""
        return self.end - self.start

    def overlaps(self, other: "Annotation") -> bool:
        """Check if this annotation overlaps with another."""
        return self.start < other.end and other.start < self.end

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "start": self.start,
            "end": self.end,
            "text": self.text,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Annotation":
        """Create from dictionary representation."""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            start=data["start"],
            end=data["end"],
            text=data["text"],
        )


@dataclass
class Tier:
    """A tier containing multiple annotations."""
    name: str
    annotations: list[Annotation] = field(default_factory=list)
    tier_type: str = "interval"  # "interval" or "point"

    def add(self, annotation: Annotation) -> None:
        """Add an annotation to this tier."""
        self.annotations.append(annotation)
        self._sort()

    def _sort(self) -> None:
        """Sort annotations by start time."""
        self.annotations.sort(key=lambda a: a.start)

    def get_at_time(self, time: float) -> Optional[Annotation]:
        """Get the annotation at a specific time."""
        for ann in self.annotations:
            if ann.start <= time < ann.end:
                return ann
        return None

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "tier_type": self.tier_type,
            "annotations": [a.to_dict() for a in self.annotations],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Tier":
        """Create from dictionary representation."""
        tier = cls(
            name=data["name"],
            tier_type=data.get("tier_type", "interval"),
        )
        tier.annotations = [Annotation.from_dict(a) for a in data.get("annotations", [])]
        return tier


@dataclass
class TextGrid:
    """
    A collection of annotation tiers.
    Compatible with Praat TextGrid format.
    """
    tiers: list[Tier] = field(default_factory=list)
    duration: float = 0.0

    def add_tier(self, tier: Tier) -> None:
        """Add a tier to this TextGrid."""
        self.tiers.append(tier)

    def get_tier(self, name: str) -> Optional[Tier]:
        """Get a tier by name."""
        for tier in self.tiers:
            if tier.name == name:
                return tier
        return None

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "duration": self.duration,
            "tiers": [t.to_dict() for t in self.tiers],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TextGrid":
        """Create from dictionary representation."""
        tg = cls(duration=data.get("duration", 0.0))
        tg.tiers = [Tier.from_dict(t) for t in data.get("tiers", [])]
        return tg

    def to_json(self, path: Optional[Path] = None) -> str:
        """Export to JSON format."""
        data = json.dumps(self.to_dict(), indent=2)
        if path:
            Path(path).write_text(data)
        return data

    @classmethod
    def from_json(cls, path_or_string: str) -> "TextGrid":
        """Import from JSON format."""
        if Path(path_or_string).exists():
            data = json.loads(Path(path_or_string).read_text())
        else:
            data = json.loads(path_or_string)
        return cls.from_dict(data)

    def to_textgrid(self, path: Path) -> None:
        """
        Export to Praat TextGrid format.
        """
        lines = [
            'File type = "ooTextFile"',
            'Object class = "TextGrid"',
            "",
            f"xmin = 0",
            f"xmax = {self.duration}",
            "tiers? <exists>",
            f"size = {len(self.tiers)}",
            "item []:",
        ]

        for i, tier in enumerate(self.tiers, 1):
            lines.append(f"    item [{i}]:")
            lines.append(f'        class = "IntervalTier"')
            lines.append(f'        name = "{tier.name}"')
            lines.append(f"        xmin = 0")
            lines.append(f"        xmax = {self.duration}")
            lines.append(f"        intervals: size = {len(tier.annotations)}")

            for j, ann in enumerate(tier.annotations, 1):
                lines.append(f"        intervals [{j}]:")
                lines.append(f"            xmin = {ann.start}")
                lines.append(f"            xmax = {ann.end}")
                lines.append(f'            text = "{ann.text}"')

        Path(path).write_text("\n".join(lines))

    @classmethod
    def from_textgrid(cls, path: Path) -> "TextGrid":
        """
        Import from Praat TextGrid format.
        This is a simplified parser - for production use,
        consider using the textgrid library.
        """
        # TODO: Implement full TextGrid parsing
        # For now, use the textgrid library or praatio
        raise NotImplementedError(
            "TextGrid parsing not yet implemented. "
            "Use praatio or textgrid library for now."
        )
