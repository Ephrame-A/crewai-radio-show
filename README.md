# The Daily Signal

An autonomous AI radio show production pipeline that generates a daily news show with two AI hosts.

## Demo

![The Daily Signal Dashboard](./static/preview.png)

*Premium dark-themed dashboard featuring real-time pipeline tracking, script viewer, and audio player.*

## Hosts

| Host | Personality | Voice |
|------|-------------|-------|
| **Alex** | High-energy tech optimist, visionary | Kore |
| **Sam** | Skeptical realist, dry wit, advocate | Puck |

## Tech Stack

- **Orchestration**: CrewAI (Sequential multi-agent workflow)
- **Model**: Gemini 2.5 Flash
- **Search**: Serper.dev API
- **Audio**: Gemini 2.5 Multispeaker TTS
- **Frontend**: Flask with Vanilla JavaScript

## Quick Start

### 1. Install Dependencies

```bash
cd RadioShow
pip install -r requirements.txt
```

*Note: For MP3 output, ensure ffmpeg is installed on your system.*

### 2. Configure Environment

Rename or edit the `.env` file with your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SERPER_API_KEY=your_serper_api_key_here
SHOW_TOPIC=Artificial Intelligence
```

### 3. Run Application

**CLI Mode:**
```bash
python main.py
```

**Web Dashboard:**
```bash
python app.py
```
Access the dashboard at [http://localhost:5000](http://localhost:5000)

## Project Structure

- `agents.py`: Definition of Scout, Showrunner, and Scriptwriter agents.
- `tasks.py`: Research, Show Flow, and Scripting tasks.
- `crew.py`: Crew assembly and memory configuration.
- `tts_generator.py`: Gemini multispeaker text-to-speech engine.
- `main.py`: CLI entry point.
- `app.py`: Flask web server.
- `output/`: Directory for generated research, scripts, and audio.

## Pipeline Flow

1. **Research**: SerperDev Search → The Scout
2. **Structure**: The Showrunner (requires human approval in CLI)
3. **Dialogue**: The Scriptwriter
4. **Production**: Gemini TTS → `daily_show.mp3`

## Implementation Details

- **Human-in-the-loop**: The Showrunner task pauses for approval when running in CLI mode to ensure content quality.
- **Memory**: Agents share context using CrewAI's built-in memory system.
- **Audio Output**: Supports both WAV and MP3 (requires ffmpeg) formats.
