"""
The Daily Signal — Agent Definitions
=====================================
Three specialized agents that form the radio show production pipeline:
  1. The Scout     — News researcher
  2. The Showrunner — Show structure organizer
  3. The Scriptwriter — Dialogue writer
"""

from crewai import Agent, LLM
from crewai.tools import tool
import os
import requests
from bs4 import BeautifulSoup

@tool("Search the web")
def simple_search_tool(query: str) -> str:
    """Useful to search the internet for news. Input should be a search query."""
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        return "Error: SERPER_API_KEY is not set."
    headers = {'X-API-KEY': api_key, 'Content-Type': 'application/json'}
    response = requests.post(
        'https://google.serper.dev/search',
        headers=headers,
        json={'q': query, 'num': 3}
    )
    if response.status_code == 200:
        results = response.json().get('organic', [])
        return "\\n".join([f"Title: {r.get('title')}\\nLink: {r.get('link')}\\nSnippet: {r.get('snippet')}\\n" for r in results])
    return "Search failed."

@tool("Scrape Website")
def simple_scrape_tool(url: str) -> str:
    """Useful to read the content of a specific website. Input should be a valid URL."""
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        return soup.get_text(separator=' ', strip=True)[:5000]
    except Exception as e:
        return f"Failed to scrape: {str(e)}"


def get_llm():
    """Get the Gemini 2.5 Flash LLM instance for all agents."""
    return LLM(
        model="gemini/gemini-2.5-flash",
        temperature=0.7,
    )


def create_scout():
    """
    The Scout — News Researcher Agent
    Finds the top 3 news stories using SerperDevTool (search)
    and ScrapeWebsiteTool (reads full articles).
    """
    return Agent(
        role="Senior News Researcher",
        goal=(
            "Find the top 3 most interesting and relevant news stories "
            "in {topic} from the last 24 hours. For each story, get the "
            "headline, source, key details, and why it matters."
        ),
        backstory=(
            "You are 'The Scout' — a veteran digital journalist with an "
            "uncanny ability to sniff out the stories that actually matter. "
            "You don't just skim headlines; you dig into articles to pull "
            "out the juicy details that make for great radio. You have a "
            "nose for what will spark a lively conversation between two hosts."
        ),
        tools=[simple_search_tool, simple_scrape_tool],
        llm=get_llm(),
        verbose=True,
        max_rpm=10,  # Throttling to avoid 429 Resource Exhausted errors
        allow_delegation=False,
    )


def create_showrunner():
    """
    The Showrunner — Show Structure Organizer Agent
    Takes raw news and organizes it into a broadcast-ready Show Flow.
    """
    return Agent(
        role="Radio Show Producer",
        goal=(
            "Take the raw news research and organize it into a compelling "
            "'Show Flow' document that structures a 3-to-5 minute radio show. "
            "The flow must include: an engaging Intro hook, three distinct "
            "Segments (one per story), and a memorable Outro."
        ),
        backstory=(
            "You are 'The Showrunner' — a seasoned radio producer who has "
            "worked at NPR, BBC Radio, and several top podcasts. You know "
            "exactly how to pace a short-form show. You understand that the "
            "intro needs to hook listeners in 10 seconds, each segment needs "
            "a clear angle that two hosts can debate, and the outro should "
            "leave the audience thinking. You're the architect of conversation."
        ),
        llm=get_llm(),
        verbose=True,
        max_rpm=10,
        allow_delegation=False,
    )


def create_scriptwriter():
    """
    The Scriptwriter — Dialogue Writer Agent
    Writes the actual two-host dialogue between Alex and Sam.
    """
    return Agent(
        role="Radio Show Scriptwriter",
        goal=(
            "Write a natural, engaging dialogue script for a radio show "
            "between two hosts: Alex and Sam. The script should feel like "
            "a real conversation — not a lecture. It should be 3-to-5 "
            "minutes when read aloud."
        ),
        backstory=(
            "You are 'The Scriptwriter' — a creative writer who specializes "
            "in conversational media. You write dialogue that sounds like two "
            "friends talking at a coffee shop about the news, not like a "
            "corporate presentation.\n\n"
            "You write for two distinct voices:\n"
            "- ALEX: The high-energy tech-optimist. Gets excited about new "
            "developments, speaks fast, uses vivid analogies, and always "
            "sees the big picture. Tends to say things like 'This is huge!' "
            "and 'Think about what this means for...'\n"
            "- SAM: The 'wait-a-minute' realist skeptic. Asks the hard "
            "questions, plays devil's advocate, and always brings it back "
            "to 'Why does this actually matter to regular people?' Sam is "
            "witty, a bit dry, and keeps Alex grounded.\n\n"
            "FORMAT: Every line MUST start with either 'Alex:' or 'Sam:' "
            "followed by their dialogue. No stage directions, no narration. "
            "Just pure dialogue."
        ),
        llm=get_llm(),
        verbose=True,
        max_rpm=10,
        allow_delegation=False,
    )
