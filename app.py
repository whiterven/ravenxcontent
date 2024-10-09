# Importing the necessary components from agents.py, tasks.py, and other files
from agents import researcher_agent, writer_agent
from tasks import research_task, writing_task
from crewai import Crew, Process

# Example functions to collect user input
def collect_user_info():
    # Collect user information (content type, topic, tone)
    content_type = input("Enter content type (e.g., blog post, article, social media post): ")
    topic = input("Enter the topic: ")
    tone = input("Enter the desired tone (e.g., formal, conversational, humorous): ")
    
    return content_type, topic, tone

# Main execution function
def main():
    # Collect user info
    content_type, topic, tone = collect_user_info()

    # The agents and tasks have already been defined with user input in their respective files (agents.py and tasks.py),
    # so there's no need to redefine them here.
    
    # Set up the Crew
    crew = Crew(
        agents=[researcher_agent, writer_agent],
        tasks=[research_task, writing_task],
        process=Process.sequential,  # Process agents and tasks in sequence
        verbose=True
    )

    # Kick off the crew and run the tasks
    crew_output = crew.kickoff()

    # Output the result
    print("Crew Output:", crew_output)

# Run the program
if __name__ == "__main__":
    main()
