"""Generate fixed neural-TTS assets for every speakable lesson item."""

import argparse
import asyncio
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOPICS = ROOT / "data" / "topics"
OUTPUT = ROOT / "public" / "audio" / "tts"
MANIFEST = ROOT / "data" / "tts-manifest.json"
VOICE_BY_LEVEL = {
    "A1": ("en-US-JennyNeural", "-10%"),
    "A2": ("en-US-AvaNeural", "-6%"),
    "B1": ("en-US-AndrewNeural", "-2%"),
    "B2": ("en-GB-SoniaNeural", "+0%"),
}
CONCURRENCY = 10


def collect_items(mock_only=False):
    items = {}
    if not mock_only:
        for topic_path in sorted(TOPICS.glob("*.json")):
            lesson = json.loads(topic_path.read_text(encoding="utf-8"))
            level = lesson["level"]
            for section in lesson["sections"]:
                if section["type"] == "vocabulary":
                    for card in section["cards"]:
                        items.setdefault(card["term"], level)
                elif section["type"] == "synonyms":
                    for row in section["rows"]:
                        for word in row["advanced"]:
                            items.setdefault(word, level)
                elif section["type"] == "speaking":
                    items.setdefault(section["sampleAnswer"], level)

    mock_path = ROOT / "data" / "mock-exams.json"
    if mock_path.exists():
        mocks = json.loads(mock_path.read_text(encoding="utf-8"))
        for exam in mocks.get("exams", []):
            listening = exam.get("listening", {})
            transcripts = list(listening.get("audioClips", {}).values())
            legacy = listening.get("transcript", "").strip()
            if legacy:
                transcripts.append(legacy)
            for transcript in transcripts:
                if transcript.strip():
                    # Aptis mock papers use the same natural B2 neural voice as
                    # the higher-level module samples, independent of level.
                    items.setdefault(transcript.strip(), "B2")
    return items


def asset_name(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:20] + ".mp3"


async def generate_one(semaphore, text, level, target):
    if target.exists() and target.stat().st_size > 0:
        return
    voice, rate = VOICE_BY_LEVEL.get(level, VOICE_BY_LEVEL["B2"])
    async with semaphore:
        import edge_tts
        await edge_tts.Communicate(text, voice, rate=rate).save(str(target))
        print(f"generated {level} {target.name}")


async def main(manifest_only=False, mock_only=False):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    items = collect_items(mock_only=mock_only)
    semaphore = asyncio.Semaphore(CONCURRENCY)
    if not manifest_only:
        await asyncio.gather(*(
            generate_one(semaphore, text, level, OUTPUT / asset_name(text))
            for text, level in items.items()
        ))
    manifest = {}
    if mock_only and MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest.update({
        text: f"/audio/tts/{asset_name(text)}?v=1"
        for text in sorted(items)
    })
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(manifest)} neural TTS entries to {MANIFEST}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest-only",
        action="store_true",
        help="Rebuild the manifest from lesson content without importing edge-tts.",
    )
    parser.add_argument(
        "--mock-only",
        action="store_true",
        help="Generate all mock listening clips, preserving the existing lesson manifest.",
    )
    args = parser.parse_args()
    asyncio.run(main(manifest_only=args.manifest_only, mock_only=args.mock_only))
