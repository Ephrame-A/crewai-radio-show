import os
import sys

# Opt out of telemetry to avoid signal handler errors
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"

from dotenv import load_dotenv


def main():
    """Run the full Daily Signal pipeline: Research → Structure → Script → Audio."""

    # Load environment variables
    load_dotenv()

    # Validate API keys
    if not os.getenv("GEMINI_API_KEY"):
        print("❌ GEMINI_API_KEY not found in .env file!")
        print("   Get yours at: https://aistudio.google.com/apikey")
        sys.exit(1)

    if not os.getenv("SERPER_API_KEY"):
        print("❌ SERPER_API_KEY not found in .env file!")
        print("   Get yours at: https://serper.dev/")
        sys.exit(1)

    # Set API keys for CrewAI's LiteLLM integration
    gemini_key = os.getenv("GEMINI_API_KEY")
    os.environ["GEMINI_API_KEY"] = gemini_key
    os.environ["GOOGLE_API_KEY"] = gemini_key
    os.environ["SERPER_API_KEY"] = os.getenv("SERPER_API_KEY")
    
    os.environ["CREWAI_TELEMETRY_OPT_OUT"] = "true"
    os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"

    # Get topic from .env or use default
    topic = os.getenv("SHOW_TOPIC", "Artificial Intelligence")

    print("\n" + "=" * 60)
    print("📻  THE DAILY SIGNAL — Autonomous Radio Show Pipeline")
    print("=" * 60)
    print(f"\n🎯 Topic: {topic}")
    print(f"📅 Generating today's show...\n")

    # Create output directory
    os.makedirs("output", exist_ok=True)

    # --- PHASE 1: Run the CrewAI Pipeline ---
    print("\n🚀 PHASE 1: Running CrewAI Pipeline")
    print("-" * 40)

    from crew import create_crew
    crew, topic = create_crew(topic)

    result = crew.kickoff(inputs={"topic": topic})

    # Get the final script output
    script_output = str(result)

    print("\n✅ CrewAI Pipeline Complete!")
    print(f"📄 Script length: {len(script_output)} characters")

    # Save the raw result
    with open("output/show_script.txt", "w", encoding="utf-8") as f:
        f.write(script_output)
    print("📁 Script saved to: output/show_script.txt")

    # --- PHASE 2: Generate Audio ---
    print("\n🚀 PHASE 2: Generating Audio")
    print("-" * 40)

    from tts_generator import generate_audio
    audio_path = generate_audio(script_output)

    if audio_path:
        print(f"\n🎉 Show is ready! Audio saved to: {audio_path}")
    else:
        print("\n⚠️  Audio generation failed, but script is saved.")
        print("    You can retry audio generation separately.")

    print("\n" + "=" * 60)
    print("📻  THE DAILY SIGNAL — Production Complete!")
    print("=" * 60)

    return script_output, audio_path if audio_path else None


if __name__ == "__main__":
    main()
