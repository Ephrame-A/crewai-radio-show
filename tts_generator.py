"""
The Daily Signal — TTS Audio Generator
========================================
Parses the Alex/Sam dialogue script and generates a single MP3
audio file using Gemini 2.5 Flash TTS with distinct voices.
"""

import os
import re
import wave
import struct
from google import genai
from google.genai import types


# Voice assignments — distinct character voices
VOICE_CONFIG = {
    "Alex": "Kore",    # Energetic, fast-talking voice
    "Sam": "Puck",     # Calm, measured, skeptical voice
}


def parse_script(script_text: str) -> list[dict]:
    """
    Parse the dialogue script into structured lines.

    Args:
        script_text: Raw script text with 'Alex: ...' and 'Sam: ...' lines

    Returns:
        List of dicts with 'speaker' and 'text' keys
    """
    lines = []
    current_speaker = None
    current_text = []

    for line in script_text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue

        # Check if line starts with a speaker tag
        match = re.match(r"^(Alex|Sam)\s*:\s*(.+)", line, re.IGNORECASE)
        if match:
            # Save previous speaker's accumulated text
            if current_speaker and current_text:
                lines.append({
                    "speaker": current_speaker,
                    "text": " ".join(current_text),
                })

            current_speaker = match.group(1).capitalize()
            # Capitalize 'alex' -> 'Alex', 'sam' -> 'Sam'
            if current_speaker.lower() == "alex":
                current_speaker = "Alex"
            else:
                current_speaker = "Sam"
            current_text = [match.group(2).strip()]
        elif current_speaker:
            # Continuation of previous speaker's line
            current_text.append(line)

    # Don't forget the last line
    if current_speaker and current_text:
        lines.append({
            "speaker": current_speaker,
            "text": " ".join(current_text),
        })

    return lines


def build_tts_prompt(parsed_lines: list[dict]) -> str:
    """
    Build a TTS-ready prompt from parsed dialogue lines.

    Args:
        parsed_lines: List of parsed speaker/text dicts

    Returns:
        Formatted string for Gemini multispeaker TTS
    """
    prompt_parts = [
        "TTS the following radio show conversation between Alex and Sam. "
        "Alex is high-energy and enthusiastic, speaking with excitement and pace. "
        "Sam is calm, skeptical, and measured with dry wit.\n\n"
    ]

    for line in parsed_lines:
        prompt_parts.append(f"{line['speaker']}: {line['text']}")

    return "\n".join(prompt_parts)


def save_wave_file(filename: str, pcm_data: bytes, channels: int = 1,
                   rate: int = 24000, sample_width: int = 2):
    """Save raw PCM data as a WAV file."""
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm_data)


def convert_wav_to_mp3(wav_path: str, mp3_path: str):
    """
    Convert WAV to MP3 using pydub.
    Falls back to keeping WAV if ffmpeg is not available.
    """
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_wav(wav_path)
        audio.export(mp3_path, format="mp3", bitrate="192k")
        # Clean up the temp WAV
        os.remove(wav_path)
        print(f"  ✅ Saved: {mp3_path}")
        return mp3_path
    except Exception as e:
        print(f"  ⚠️  MP3 conversion failed ({e}). Keeping WAV file.")
        print(f"  💡 Install ffmpeg to enable MP3 conversion.")
        # Rename wav to indicate it's the final output
        final_wav = mp3_path.replace(".mp3", ".wav")
        if wav_path != final_wav:
            os.rename(wav_path, final_wav)
        return final_wav


def generate_audio(script_text: str, output_path: str = "output/daily_show.mp3") -> str:
    """
    Main function: takes script text, generates TTS audio, saves as MP3.

    Args:
        script_text: The complete dialogue script
        output_path: Where to save the final audio file

    Returns:
        Path to the generated audio file
    """
    print("\n🎙️  THE DAILY SIGNAL — Audio Generation")
    print("=" * 50)

    # Step 1: Parse the script
    print("\n📝 Parsing script...")
    parsed_lines = parse_script(script_text)

    if not parsed_lines:
        print("  ❌ No dialogue lines found in script!")
        print("  Make sure lines start with 'Alex:' or 'Sam:'")
        return ""

    alex_count = sum(1 for l in parsed_lines if l["speaker"] == "Alex")
    sam_count = sum(1 for l in parsed_lines if l["speaker"] == "Sam")
    print(f"  Found {len(parsed_lines)} lines ({alex_count} Alex, {sam_count} Sam)")

    # Step 2: Build the TTS prompt
    print("\n🔧 Building TTS prompt...")
    tts_prompt = build_tts_prompt(parsed_lines)

    # Step 3: Call Gemini TTS
    print("\n🎤 Generating audio with Gemini 2.5 Flash TTS...")
    print("  (This may take 30-60 seconds for a full show)")

    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=tts_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                        speaker_voice_configs=[
                            types.SpeakerVoiceConfig(
                                speaker="Alex",
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                        voice_name=VOICE_CONFIG["Alex"],
                                    )
                                ),
                            ),
                            types.SpeakerVoiceConfig(
                                speaker="Sam",
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                        voice_name=VOICE_CONFIG["Sam"],
                                    )
                                ),
                            ),
                        ]
                    )
                ),
            ),
        )

        # Step 4: Extract audio data
        audio_data = response.candidates[0].content.parts[0].inline_data.data

        # Step 5: Save as WAV first
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        wav_path = output_path.replace(".mp3", "_temp.wav")
        save_wave_file(wav_path, audio_data)
        print(f"  ✅ Raw audio generated ({len(audio_data):,} bytes)")

        # Step 6: Convert to MP3
        print("\n🔄 Converting to MP3...")
        final_path = convert_wav_to_mp3(wav_path, output_path)

        print("\n" + "=" * 50)
        print(f"🎉 Audio ready: {final_path}")
        print("=" * 50)

        return final_path

    except Exception as e:
        print(f"\n  ❌ TTS Generation failed: {e}")
        print("  Check that your GEMINI_API_KEY is valid and has TTS access.")
        return ""


# --- Standalone test ---
if __name__ == "__main__":
    sample_script = """
Alex: Welcome to The Daily Signal! I'm Alex, and today we've got some incredible stories.
Sam: And I'm Sam. Let's see if they're actually as incredible as Alex thinks.
Alex: Oh trust me, the first one is going to blow your mind. OpenAI just released a new model that can reason through complex math problems in real-time!
Sam: Okay, but can it do my taxes? Because that's the kind of math I actually care about.
Alex: Ha! Fair point. But seriously, this is a big step toward artificial general intelligence.
Sam: That's what they say every six months, Alex. I'll believe it when my AI assistant stops misunderstanding my grocery list.
Alex: That's all for today's show! Thanks for tuning in.
Sam: See you tomorrow. Try not to believe everything Alex says.
    """

    from dotenv import load_dotenv
    load_dotenv()
    generate_audio(sample_script, "output/daily_show.mp3")
