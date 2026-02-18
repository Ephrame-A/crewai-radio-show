"""
The Daily Signal — Flask Web Application
==========================================
Web dashboard for controlling and monitoring the radio show pipeline.
"""

import os
import sys

# Opt out of telemetry to avoid signal handler errors in background threads
os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"

import json
import threading
from datetime import datetime
from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Global State ---
pipeline_state = {
    "status": "idle",          # idle, running, complete, error
    "current_step": "",
    "topic": os.getenv("SHOW_TOPIC", "Artificial Intelligence"),
    "steps": [
        {"name": "The Scout", "icon": "🔍", "status": "pending", "detail": "Searching for news..."},
        {"name": "The Showrunner", "icon": "📋", "status": "pending", "detail": "Structuring show flow..."},
        {"name": "The Scriptwriter", "icon": "✍️", "status": "pending", "detail": "Writing dialogue..."},
        {"name": "Audio Generation", "icon": "🎙️", "status": "pending", "detail": "Generating TTS audio..."},
    ],
    "script": "",
    "audio_path": "",
    "error": "",
    "started_at": "",
    "completed_at": "",
}


def reset_state(topic: str = None):
    """Reset pipeline state for a new run."""
    pipeline_state["status"] = "idle"
    pipeline_state["current_step"] = ""
    if topic:
        pipeline_state["topic"] = topic
    pipeline_state["steps"] = [
        {"name": "The Scout", "icon": "🔍", "status": "pending", "detail": "Searching for news..."},
        {"name": "The Showrunner", "icon": "📋", "status": "pending", "detail": "Structuring show flow..."},
        {"name": "The Scriptwriter", "icon": "✍️", "status": "pending", "detail": "Writing dialogue..."},
        {"name": "Audio Generation", "icon": "🎙️", "status": "pending", "detail": "Generating TTS audio..."},
    ]
    pipeline_state["script"] = ""
    pipeline_state["audio_path"] = ""
    pipeline_state["error"] = ""
    pipeline_state["started_at"] = ""
    pipeline_state["completed_at"] = ""


def run_pipeline(topic: str):
    """Run the full pipeline in a background thread."""
    try:
        pipeline_state["status"] = "running"
        pipeline_state["started_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Set API keys for CrewAI and tools
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        os.environ["GEMINI_API_KEY"] = gemini_key
        os.environ["GOOGLE_API_KEY"] = gemini_key 
        os.environ["SERPER_API_KEY"] = os.getenv("SERPER_API_KEY", "")
        
        # Ensure telemetry is disabled in the background thread too
        os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"
        os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"

        os.makedirs("output", exist_ok=True)

        # Step 1-3: Run CrewAI Pipeline
        pipeline_state["current_step"] = "The Scout"
        pipeline_state["steps"][0]["status"] = "running"

        from crew import create_crew
        crew, topic = create_crew(topic)

        # We simulate step progression (CrewAI runs sequentially internally)
        def update_step(step_idx):
            for i in range(step_idx):
                pipeline_state["steps"][i]["status"] = "complete"
            if step_idx < 3:
                pipeline_state["steps"][step_idx]["status"] = "running"
                pipeline_state["current_step"] = pipeline_state["steps"][step_idx]["name"]

        update_step(0)
        result = crew.kickoff(inputs={"topic": topic})
        script_output = str(result)

        # Mark CrewAI steps as complete
        for i in range(3):
            pipeline_state["steps"][i]["status"] = "complete"

        pipeline_state["script"] = script_output

        # Save script
        with open("output/show_script.txt", "w", encoding="utf-8") as f:
            f.write(script_output)

        # Step 4: Generate Audio
        pipeline_state["current_step"] = "Audio Generation"
        pipeline_state["steps"][3]["status"] = "running"

        from tts_generator import generate_audio
        audio_path = generate_audio(script_output)

        pipeline_state["steps"][3]["status"] = "complete"
        pipeline_state["audio_path"] = audio_path or ""
        pipeline_state["status"] = "complete"
        pipeline_state["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    except Exception as e:
        pipeline_state["status"] = "error"
        pipeline_state["error"] = str(e)
        # Mark current step as error
        for step in pipeline_state["steps"]:
            if step["status"] == "running":
                step["status"] = "error"


# --- Routes ---

@app.route("/")
def index():
    """Serve the main dashboard."""
    return render_template("index.html")


@app.route("/api/status")
def get_status():
    """Get current pipeline status."""
    return jsonify(pipeline_state)


@app.route("/api/start", methods=["POST"])
def start_pipeline():
    """Start the pipeline with a given topic."""
    if pipeline_state["status"] == "running":
        return jsonify({"error": "Pipeline is already running!"}), 400

    data = request.json or {}
    topic = data.get("topic", os.getenv("SHOW_TOPIC", "Artificial Intelligence"))

    reset_state(topic)
    pipeline_state["status"] = "running"

    # Run in background thread
    thread = threading.Thread(target=run_pipeline, args=(topic,), daemon=True)
    thread.start()

    return jsonify({"message": f"Pipeline started for topic: {topic}"})


@app.route("/api/script")
def get_script():
    """Get the current script content."""
    script_path = "output/show_script.txt"
    if os.path.exists(script_path):
        with open(script_path, "r", encoding="utf-8") as f:
            return jsonify({"script": f.read()})
    return jsonify({"script": pipeline_state.get("script", "")})


@app.route("/api/audio")
def get_audio():
    """Serve the generated audio file."""
    # Try MP3 first, then WAV
    if os.path.exists("output/daily_show.mp3"):
        return send_file("output/daily_show.mp3", mimetype="audio/mpeg", as_attachment=False)
    
    if os.path.exists("output/daily_show.wav"):
        return send_file("output/daily_show.wav", mimetype="audio/wav", as_attachment=False)
        
    return jsonify({"error": "No audio file available"}), 404


@app.route("/api/research")
def get_research():
    """Get the research output."""
    research_path = "output/show_research.txt"
    if os.path.exists(research_path):
        with open(research_path, "r", encoding="utf-8") as f:
            return jsonify({"research": f.read()})
    return jsonify({"research": ""})


if __name__ == "__main__":
    print("\n📻 The Daily Signal — Web Dashboard")
    print("=" * 40)
    print("🌐 Open: http://localhost:5000")
    print("=" * 40 + "\n")
    app.run(debug=True, port=5000)
