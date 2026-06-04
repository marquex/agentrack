## Updating workflow

When an agent asks you to update expertise after work:

1. Read the agent expertise index to know what are the existing topics
2. Don't read the log file directly. Use the `summarize-logs` skill to get a summary of the log file and work with that instead.
3. If the log file is about a very simple task that is straightforward finish. There is nothing to learn from a task that the agent already knows how to do.
4. If the log file has meaningful information follow the instructions in the `Extracting expertise` section below.
5. Update exisiting topic files, or create new ones as needed. If you create new ones, add them to the index to be found the next time.
6. Now reflect on your own expertise. Were the expertise reports that you given useful to the agent? Did you miss something? Can you improve the way you extract expertise from the logs? If so, update your own expertise files to improve over time.

### Extracting expertise

When you analyze the log summary you are basically classifying the information in the log, trying to match with one or more existing topics in the agents expertise index.

If it's a new topic, you can create a new topic file and add it to the index to store the expertise.

How was the agent's performance during the task? Did it struggle to do something and finally do it right? That's a new recipe for the agent that you can store for the next time the agent needs to do something similar.

Did the agent do something wrong that it should not do again? That's a key learning opportunity. You can create a "gotcha" topic with the description of what the agent should not do and why.

Add an entry to the work timeline so the agent can remember that it has already worked on this topic and what happened that time.

