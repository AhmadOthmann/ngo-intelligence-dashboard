"""
Generate 10 separate Sora video clips from an Impact Atlas pitch script.

How to use:
1) Put prompt_script.txt at SCRIPT_PATH below, or set PITCH_SCRIPT_PATH.
2) Set your API key as an environment variable:
   Windows PowerShell:
      setx OPENAI_API_KEY "your_api_key_here"
   macOS/Linux:
      export OPENAI_API_KEY="your_api_key_here"
3) Run:
      python sora_batch_scenes.py

Optional environment variables:
- SORA_MODEL=sora-2-pro
- SORA_SECONDS=12
- SORA_SIZE=1280x720
- SORA_POLL_SECONDS=5
- SORA_SCENES=1-10        # examples: "1-10", "2", "1,3,5"
- SORA_DRY_RUN=1          # writes prompts only, does not call API
- SORA_OUTPUT_DIR=pitch_video_outputs
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from openai import OpenAI


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Change this path if your prompt_script.txt is somewhere else.
SCRIPT_PATH = Path(r"C:\Users\farah\iCloudDrive\Masters\Masters AI in Society\SS2026\AI for Good\ngo-intelligence-dashboard\pitch_video\prompt_script.txt")
OUTPUT_DIR = Path(r"C:\Users\farah\iCloudDrive\Masters\Masters AI in Society\SS2026\AI for Good\ngo-intelligence-dashboard\pitch_video\videos")
PROMPTS_DIR = OUTPUT_DIR / "prompts"
JOBS_PATH = OUTPUT_DIR / "sora_scene_jobs.jsonl"

MODEL = os.getenv("SORA_MODEL", "sora-2-pro")
SECONDS = os.getenv("SORA_SECONDS", "12")  # current accepted values commonly include "4", "8", "12"
SIZE = os.getenv("SORA_SIZE", "1280x720")  # 16:9 landscape for a pitch video
POLL_SECONDS = int(os.getenv("SORA_POLL_SECONDS", "5"))
SCENES_TO_RENDER = os.getenv("SORA_SCENES", "1-10")
DRY_RUN = os.getenv("SORA_DRY_RUN", "0") == "1"


# ---------------------------------------------------------------------------
# Shared visual bible for character consistency
# ---------------------------------------------------------------------------

CHARACTER_AND_STYLE_BIBLE = """
VISUAL CONTINUITY BIBLE — use this exact same look in every scene:

Overall video style:
- Realistic cinematic SaaS pitch film, clean and modern, warm morning light.
- 16:9 landscape composition, smooth camera movements, documentary-style closeups.
- Color palette: clean white UI, soft gray backgrounds, subtle blue-to-green Impact Atlas gradient accents.
- Do not show real NGO logos, real donor logos, real customer names, or copyrighted website layouts.
- Text on screens should be minimal, clean, and readable only when important.
- Do not show captions of the narrator text on screen unless a scene specifically asks for a logo or UI label.

Emma — consistent character:
- Fictional NGO program officer working remotely from Europe.
- Woman in her early 30s, medium-light olive skin tone, expressive brown eyes.
- Shoulder-length dark brown wavy hair, usually tucked slightly behind one ear.
- Calm, focused, thoughtful expression; professional but approachable.
- Wears the same outfit in every scene: soft cream knit sweater, small gold hoop earrings, simple watch.
- Works on a silver laptop at a bright wooden desk.
- Her home office has warm natural morning light, a small plant, a ceramic coffee mug, sticky notes, and a soft beige background.
- She supports an education-focused NGO working with communities in East Africa.

David — consistent character:
- Fictional NGO partnership officer working remotely from Europe.
- Man in his late 30s to early 40s, light skin tone, short dark blond hair, neatly trimmed beard, rectangular glasses.
- Calm, analytical, slightly serious expression; kind and collaborative.
- Wears the same outfit in every scene: navy button-up shirt over a white T-shirt.
- Works on a dark laptop at a compact modern desk.
- His home office has cooler daylight, a dark green plant, a notebook, a coffee cup, and a muted blue-gray wall.
- He supports an animal welfare and wildlife-protection NGO with projects across Africa.

Impact Atlas app UI continuity:
- The app name is Impact Atlas.
- The interface is clean white, spacious, modern, with rounded cards and subtle blue-to-green gradient highlights.
- Main navigation labels may appear when relevant: Signal Inbox, Saved Signals, Peer Chat, Profile.
- Signal cards look like concise intelligence cards: title, short summary, region, topic, source, relevance indicator, deadline when relevant.
- Use the same app visual design in every scene so it feels like one coherent product.
"""


SCENE_DIRECTING_RULES = """
DIRECTING RULES FOR THIS SCENE:
- Generate only the requested scene, not the whole script.
- Keep Emma and David visually identical to the continuity bible.
- Preserve the same clothing, hairstyle, laptops, desks, rooms, and app design across scenes.
- Prioritize clear visual storytelling over too much text.
- Show screen content only as clean UI glimpses; avoid tiny unreadable text.
- No dialogue from Emma or David unless the scene explicitly requires a message being typed.
- If audio narration is supported, use a calm, confident pitch-video narrator tone based on the Narrator text in the scene.
- If audio narration is not supported, still create a strong silent visual clip.
- Keep the clip paced for a 12-second pitch-video scene.
"""


# ---------------------------------------------------------------------------
# Scene parsing
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Scene:
    number: int
    title: str
    body: str


def parse_scene_numbers(raw: str) -> list[int]:
    """Parse scene selection like '1-10', '2', or '1,3,5'."""
    numbers: set[int] = set()

    for part in raw.replace(" ", "").split(","):
        if not part:
            continue

        if "-" in part:
            start_s, end_s = part.split("-", 1)
            start, end = int(start_s), int(end_s)
            numbers.update(range(start, end + 1))
        else:
            numbers.add(int(part))

    return sorted(n for n in numbers if 1 <= n <= 10)


def parse_scenes(script_text: str) -> dict[int, Scene]:
    """
    Split a markdown script into scenes with headings like:
    ## Scene 1 – Another Busy Morning
    ## Scene 10
    """
    heading_pattern = re.compile(
        r"^##\s*Scene\s+(\d+)(?:\s*[–-]\s*(.*?))?\s*$",
        flags=re.MULTILINE | re.IGNORECASE,
    )

    matches = list(heading_pattern.finditer(script_text))
    if not matches:
        raise ValueError("No scene headings found. Expected headings like '## Scene 1 – Title'.")

    scenes: dict[int, Scene] = {}

    for idx, match in enumerate(matches):
        number = int(match.group(1))
        title = (match.group(2) or f"Scene {number}").strip()
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(script_text)
        body = script_text[start:end].strip()

        scenes[number] = Scene(number=number, title=title, body=body)

    return scenes


def slugify(value: str, max_len: int = 50) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value[:max_len] or "scene"


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

def build_scene_prompt(scene: Scene) -> str:
    return f"""
Create Scene {scene.number} of 10 for a polished pitch video for the fictional NGO intelligence platform Impact Atlas.

SCENE TITLE:
Scene {scene.number} — {scene.title}

{CHARACTER_AND_STYLE_BIBLE}

{SCENE_DIRECTING_RULES}

SCENE-SPECIFIC SCRIPT SOURCE:
{scene.body}

FINAL OUTPUT GOAL:
A coherent, cinematic 12-second clip that can be edited together with the other 9 scenes.
The scene must visually match the same Emma, David, Impact Atlas interface, lighting style, and tone used in all other clips.
""".strip()


# ---------------------------------------------------------------------------
# Sora API helpers
# ---------------------------------------------------------------------------

def make_client() -> OpenAI:
    OPENAI_API_KEY = "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"

    return OpenAI(api_key = OPENAI_API_KEY)


def create_video(client: OpenAI, prompt: str):
    return client.videos.create(
        model=MODEL,
        prompt=prompt,
        seconds=SECONDS,
        size=SIZE,
    )


def wait_for_video(client: OpenAI, video_id: str, scene_number: int):
    video = client.videos.retrieve(video_id)

    while getattr(video, "status", None) in ("queued", "in_progress"):
        status = getattr(video, "status", "unknown")
        progress = getattr(video, "progress", 0) or 0
        sys.stdout.write(f"\rScene {scene_number:02d} | {status:<11} | {progress:>5.1f}%")
        sys.stdout.flush()
        time.sleep(POLL_SECONDS)
        video = client.videos.retrieve(video_id)

    sys.stdout.write("\n")
    return video


def download_video(client: OpenAI, video_id: str, output_path: Path) -> None:
    content = client.videos.download_content(video_id, variant="video")
    content.write_to_file(str(output_path))


def append_job_record(record: dict) -> None:
    JOBS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with JOBS_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def render_scenes(scene_numbers: Iterable[int]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PROMPTS_DIR.mkdir(parents=True, exist_ok=True)

    script_text = SCRIPT_PATH.read_text(encoding="utf-8")
    scenes = parse_scenes(script_text)

    missing = [n for n in scene_numbers if n not in scenes]
    if missing:
        raise ValueError(f"These requested scenes were not found in the script: {missing}")

    client = None if DRY_RUN else make_client()

    for scene_number in scene_numbers:
        scene = scenes[scene_number]
        prompt = build_scene_prompt(scene)

        prompt_path = PROMPTS_DIR / f"scene_{scene.number:02d}_{slugify(scene.title)}_prompt.txt"
        prompt_path.write_text(prompt, encoding="utf-8")

        print(f"\n--- Scene {scene.number:02d}: {scene.title} ---")
        print(f"Prompt written to: {prompt_path}")

        if DRY_RUN:
            print("DRY_RUN=1, skipping API call.")
            continue

        assert client is not None

        video = create_video(client, prompt)
        video_id = video.id

        append_job_record(
            {
                "scene_number": scene.number,
                "scene_title": scene.title,
                "video_id": video_id,
                "model": MODEL,
                "seconds": SECONDS,
                "size": SIZE,
                "prompt_path": str(prompt_path),
                "status_after_create": getattr(video, "status", None),
            }
        )

        print(f"Video job created: {video_id}")
        completed_video = wait_for_video(client, video_id, scene.number)

        if getattr(completed_video, "status", None) != "completed":
            error = getattr(completed_video, "error", None)
            message = getattr(error, "message", "Unknown video generation error")
            print(f"Scene {scene.number:02d} failed: {message}")
            continue

        output_path = OUTPUT_DIR / f"scene_{scene.number:02d}_{slugify(scene.title)}_{video_id}.mp4"
        download_video(client, video_id, output_path)
        print(f"Downloaded: {output_path}")


if __name__ == "__main__":
    selected_scenes = parse_scene_numbers(SCENES_TO_RENDER)
    if not selected_scenes:
        raise ValueError("No valid scenes selected. Use SORA_SCENES like '1-10', '2', or '1,3,5'.")

    render_scenes(selected_scenes)
