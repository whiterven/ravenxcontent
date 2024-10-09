# Importing the Agent class from CrewAI
from crewai import Agent

# Researcher Agent
researcher_agent = Agent(
    role='Researcher for {topic} and SEO keywords',
    goal='Conduct research and provide SEO-driven draft with up-to-date information',
    backstory="""
    You are a specialized SEO Researcher working to ensure high-ranking content on search engines. 
    You utilize real-time data, competitive analysis, and trending SEO keywords to draft a 
    research-based outline that meets the {content_type}, {topic}, and is optimized for search engines.
    """,
    tools=[search],  
    llm=llm,  
    max_iter=30,  # Allow ample iterations for deep research
    max_rpm=None,
    verbose=True,
    allow_delegation=False,
    cache=True
)

# Writer Agent
writer_agent = Agent(
    role='Content Writer for {topic}',
    goal='Humanize and refine the content based on user-provided tone {tone} and {content_type}',
    backstory="""
    You are a highly skilled content writer who specializes in adapting research-based drafts into human-readable, 
    engaging content. You tailor the content to match the user's specified {content_type}, {topic}, {tone}, and length, 
    ensuring it is clear, concise, and optimized for SEO.
    """,
    llm=llm,
    max_iter=20,  # Writer can polish the content within fewer iterations
    max_rpm=None,
    verbose=True,
    allow_delegation=False,
    cache=False
)
