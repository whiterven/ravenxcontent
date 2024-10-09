# Importing the Agent class from CrewAI
import os
from crewai import Agent
from crewai_tools import SerperDevTool
from tools import tavily_search

serper_api_key = os.getenv("SERPER_API_KEY")
gemini_api_key = os.getenv("GEMINI_API_KEY")

llm = "gemini/gemini-1.5-flash"
search = SerperDevTool(n_results=4)

# Researcher Agent
def create_researcher(topic, target_audience):
    return Agent(
        role='Senior Research Analyst',
        goal=f'Conduct comprehensive research on {topic} and gather up-to-date, relevant information for {target_audience}',
        backstory=(
            f"You are a seasoned research analyst with a keen eye for detail and a passion for uncovering the most relevant and recent information about {topic}. "
            f"Your expertise spans across various industries, and you have a knack for quickly understanding complex topics that would interest {target_audience}. "
            "You're known for your ability to synthesize large amounts of data into concise, actionable insights. "
            "Your research forms the foundation of high-quality content creation, and you take pride in providing accurate, timely information."
        ),
        verbose=True,
        llm=llm,
        allow_delegation=False,
        tools=[search, tavily_search],
        cache=False
    )

def create_writer(content_type, tone, target_audience):
    return Agent(
        role='Content Strategist',
        goal=f'Craft engaging, high-quality {content_type} with a {tone} tone, tailored for {target_audience}',
        backstory=(
            f"You are a versatile content creator specializing in {content_type}, with a flair for adapting your writing style to suit a {tone} tone. "
            f"Your background in journalism and digital marketing has honed your skills in creating compelling narratives for {target_audience}. "
            "You have a deep understanding of SEO principles and know how to structure content for maximum impact and readability. "
            f"Your ability to capture the client's voice while maintaining authenticity is unparalleled, especially when writing for {target_audience}."
        ),
        verbose=True,
        llm=llm,
        allow_delegation=False,
        #tools=[search_tool],
        cache=False,  # Disable cache for this agent
    )