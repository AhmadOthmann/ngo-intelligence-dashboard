# Pitch-video generator

`pitch_video.py` parses a ten-scene Markdown script, creates one prompt per scene, and can submit those prompts to the OpenAI video API.

## Safety and cost

- Video generation can be billable. Start with `SORA_DRY_RUN=1`.
- Keep `OPENAI_API_KEY` in the environment; never put it in this script, a prompt, a job log, or Git.
- Treat every key that has appeared in Git history as compromised and rotate it.
- Generated media and job records can be large or sensitive; keep outputs out of version control.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PITCH_SCRIPT_PATH` | `pitch_video/prompt_script.txt` | Markdown scene script |
| `SORA_OUTPUT_DIR` | `pitch_video/outputs` | prompts, job records, and videos |
| `SORA_MODEL` | script default | video model identifier |
| `SORA_SECONDS` | `12` | clip length |
| `SORA_SIZE` | `1280x720` | output dimensions |
| `SORA_POLL_SECONDS` | `5` | polling interval |
| `SORA_SCENES` | `1-10` | examples: `2`, `1,3,5`, or `1-10` |
| `SORA_DRY_RUN` | `0` | set to `1` to write prompts without API calls |

## Run

From the repository root:

```bash
python pitch_video/pitch_video.py
```

Recommended first run:

```bash
SORA_DRY_RUN=1 SORA_SCENES=1 python pitch_video/pitch_video.py
```

PowerShell:

```powershell
$env:SORA_DRY_RUN = "1"
$env:SORA_SCENES = "1"
python .\pitch_video\pitch_video.py
```

The script expects headings such as:

```markdown
## Scene 1 – Another Busy Morning
```

Do not assume a configured model is available to every API account; verify access and current API behavior before a paid run.
