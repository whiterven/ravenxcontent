# Importing the Task class from CrewAI
from crewai import Task
from agents import create_researcher, create_writer

# Research Task
def create_researcher_task(researcher, topic, target_audience):
    return Task(
        description=(
            f"Conduct in-depth research on {topic} for {target_audience}. Your research should cover the following aspects:\n"
            "1. Latest trends and developments related to the topic\n"
            "2. Key statistics and data points\n"
            "3. Expert opinions and insights\n"
            "4. Relevant case studies or examples\n"
            "5. Potential counterarguments or alternative viewpoints\n\n"
            "6. Include a list of SEO-driven keywords to optimize the content for search engines. "
            "7. Provide a draft that incorporates SEO keywords and is structured to match the {content_type}."
            "8. Up-to-date, accurate information from credible sources."
            f"Ensure that all information is current, from reputable sources, and relevant to {target_audience}. "
            "Organize your findings in a clear, structured manner that will facilitate the content creation process."
        ),
        expected_output=f'A comprehensive research report containing well-organized, up-to-date information on {topic}, including sources and key insights tailored for {target_audience}.',
        agent=researcher,
    )

def create_writer_task(writer, content_type, tone, target_audience):
    return Task(
        description=(
            f"Using the research provided, create high-quality {content_type} with a {tone} tone for {target_audience}. Your task includes:\n"
            "1. Analyzing the research report and extracting the most relevant information\n"
            f"2. Structuring the content according to the {content_type} format\n"
            f"3. Adopting a {tone} tone that resonates with {target_audience}\n"
            "4. Incorporating SEO best practices to enhance visibility\n"
            "5. Crafting compelling headlines, subheadings, and calls-to-action\n"
            f"6. Ensuring the content is engaging, informative, and tailored to {target_audience}\n\n"
            "Pay special attention to the client's brand voice and industry-specific terminology. Your goal is to produce content "
            f"that not only informs but also resonates with {target_audience} and drives the desired action."
        ),
        expected_output=f'A polished, well-structured {content_type} with a {tone} tone, tailored for {target_audience}. The output should be ready for client review or publication.',
        agent=writer,
    )