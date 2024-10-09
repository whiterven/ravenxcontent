# Importing the Task class from CrewAI
from crewai import Task

# Research Task
research_task = Task(
    description="""
    Conduct research on {topic} and gather the most relevant and up-to-date information. 
    Include a list of SEO-driven keywords to optimize the content for search engines. 
    Provide a draft that incorporates SEO keywords and is structured to match the {content_type}.
    """,
    agent=researcher_agent,
    expected_output="""
    1. A research draft with a structured outline.
    2. A list of SEO keywords that should be integrated.
    3. Up-to-date, accurate information from credible sources.
    """
)

# Writing Task
writing_task = Task(
    description="""
    Humanize and refine the research draft provided by the Researcher Agent. 
    Ensure the content matches the user's {content_type}, {topic}, and {tone}. 
    The content should flow naturally, while still integrating SEO keywords to improve ranking.
    """,
    agent=writer_agent,
    expected_output="""
    1. Final content that matches the required tone, length, and format ({content_type}).
    2. Seamless integration of SEO keywords.
    3. Error-free, polished content with proper grammar and flow.
    """
)
