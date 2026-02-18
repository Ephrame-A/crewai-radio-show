"""
The Daily Signal — Crew Configuration
=======================================
Assembles agents and tasks into a sequential CrewAI pipeline
with memory enabled for context retention across agents.
"""

import os
from crewai import Crew, Process
from agents import create_scout, create_showrunner, create_scriptwriter
from tasks import create_research_task, create_showflow_task, create_script_task
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Opt out of telemetry to avoid signal handler errors in background threads
os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"

def create_crew(topic: str = "Artificial Intelligence"):
    """
    Create and return the full Daily Signal crew.

    Pipeline: Scout → Showrunner (human approval) → Scriptwriter

    Args:
        topic: The news niche to cover (e.g., "Artificial Intelligence")

    Returns:
        A configured Crew object ready to kickoff.
    """
    # Set API keys for CrewAI's LiteLLM integration and other services
    gemini_key = os.getenv("GEMINI_API_KEY")
    os.environ["GEMINI_API_KEY"] = gemini_key
    os.environ["GOOGLE_API_KEY"] = gemini_key # Standard key for Google services
    os.environ["SERPER_API_KEY"] = os.getenv("SERPER_API_KEY")

    # --- Create Agents ---
    scout = create_scout()
    showrunner = create_showrunner()
    scriptwriter = create_scriptwriter()

    # --- Create Tasks (sequential order matters) ---
    research_task = create_research_task(scout)
    showflow_task = create_showflow_task(showrunner)
    script_task = create_script_task(scriptwriter)

    # --- Assemble the Crew ---
    crew = Crew(
        agents=[scout, showrunner, scriptwriter],
        tasks=[research_task, showflow_task, script_task],
        process=Process.sequential,  # Scout → Showrunner → Scriptwriter
        memory=True,                 # Enable short-term + long-term memory
        embedder={
            "provider": "google-generativeai",
            "config": {
                "model_name": "gemini-embedding-001",
                "api_key": os.getenv("GEMINI_API_KEY"),
                "task_type": "RETRIEVAL_DOCUMENT"
            }
        },
        verbose=True,
    )

    return crew, topic
