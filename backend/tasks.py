"""
The Daily Signal — Task Definitions
=====================================
Three sequential tasks that form the production pipeline:
  1. Research Task     — Find the news
  2. Show Flow Task    — Structure the show (with human approval)
  3. Script Writing Task — Write the dialogue
"""

from crewai import Task


def create_research_task(scout_agent):
    """
    Task 1: The Scout finds the top 3 news stories.
    """
    return Task(
        description=(
            "Search the internet for the top 3 most significant news stories "
            "about {topic} from the last 24 hours.\n\n"
            "For EACH story, provide:\n"
            "1. Headline and source\n"
            "2. A 2-3 sentence summary of what happened\n"
            "3. Key quotes or data points from the article\n"
            "4. Why this story matters and what makes it interesting for discussion\n\n"
            "Use the search tool to find stories, then use the scrape tool "
            "to read the full articles and extract the important details. "
            "Don't just rely on headlines — dig deeper."
        ),
        expected_output=(
            "A structured research brief with exactly 3 news stories. "
            "Each story should have: headline, source URL, detailed summary, "
            "key facts/quotes, and a 'discussion angle' explaining why two "
            "radio hosts would find this interesting to debate."
        ),
        agent=scout_agent,
        output_file="output/show_research.txt",
    )


def create_showflow_task(showrunner_agent):
    """
    Task 2: The Showrunner builds the Show Flow structure.
    Has human_input=True so the user can approve topics before scripting.
    """
    return Task(
        description=(
            "Using the research brief provided by The Scout, create a "
            "detailed 'Show Flow' document that structures a 3-to-5 minute "
            "radio show called 'The Daily Signal'.\n\n"
            "The Show Flow MUST include:\n\n"
            "📻 INTRO (30 seconds):\n"
            "- A punchy opening hook that grabs attention\n"
            "- Brief tease of what's coming in the show\n\n"
            "📻 SEGMENT 1 (60-90 seconds):\n"
            "- The lead story — the biggest news of the day\n"
            "- Key talking points for two hosts\n"
            "- A 'debate angle' (one host will be excited, one skeptical)\n\n"
            "📻 SEGMENT 2 (60-90 seconds):\n"
            "- Second story — something unexpected or contrarian\n"
            "- Talking points and debate angle\n\n"
            "📻 SEGMENT 3 (45-60 seconds):\n"
            "- Third story — a lighter or forward-looking piece\n"
            "- Quick talking points\n\n"
            "📻 OUTRO (15-20 seconds):\n"
            "- Wrap-up thought that ties the show together\n"
            "- Teaser for why listeners should come back tomorrow"
        ),
        expected_output=(
            "A complete Show Flow document with clearly labeled sections: "
            "INTRO, SEGMENT 1, SEGMENT 2, SEGMENT 3, and OUTRO. Each "
            "section should include timing notes, key talking points, "
            "and the angle/tone for the hosts."
        ),
        agent=showrunner_agent,
        human_input=False,  # Set to False for fully autonomous dashboard operation
    )


def create_script_task(scriptwriter_agent):
    """
    Task 3: The Scriptwriter creates the final dialogue.
    """
    return Task(
        description=(
            "Using the Show Flow document, write a complete radio show script "
            "as a dialogue between two hosts: Alex and Sam.\n\n"
            "CRITICAL FORMATTING RULES:\n"
            "- Every single line MUST start with either 'Alex:' or 'Sam:'\n"
            "- No narration, no stage directions, no '[laughs]' annotations\n"
            "- Just pure dialogue, one speaker per line\n\n"
            "CHARACTER VOICES:\n"
            "- ALEX is the high-energy tech-optimist. Fast-talker, uses "
            "vivid analogies and gets genuinely excited. Says things like "
            "'This is massive!' and 'Here's why this changes everything...'\n"
            "- SAM is the skeptical realist. Dry wit, asks 'Why does this "
            "actually matter to normal people?' and 'Hold on, let's pump "
            "the brakes here.' Sam is the voice of the listener.\n\n"
            "SHOW STRUCTURE:\n"
            "- Start with a quick, energetic intro from Alex\n"
            "- Move through all three segments naturally\n"
            "- Have genuine back-and-forth — not just alternating monologues\n"
            "- End with a short, punchy outro\n"
            "- Target: 3-to-5 minutes of dialogue when read aloud\n\n"
            "Make it feel like a REAL radio show. The hosts should interrupt "
            "each other occasionally, react to what the other says, and have "
            "actual chemistry."
        ),
        expected_output=(
            "A complete radio show script formatted as:\n"
            "Alex: [dialogue]\n"
            "Sam: [dialogue]\n"
            "Alex: [dialogue]\n"
            "...and so on.\n\n"
            "The script should be 3-5 minutes when read aloud, covering "
            "all segments from the Show Flow with natural, engaging dialogue "
            "between the two hosts."
        ),
        agent=scriptwriter_agent,
        output_file="output/show_script.txt",
    )
