We want to create some instructions on how to manage issues and work with agentrack for agents.

The goal is to have clear workflows for letting agents work independently on issues and collaborate with each others to implement features, fix bugs and achieve milestones.

## The work loop

Issues are created by a manager and assigned to any agent. 

There is a process that runs every minute checking the issues. If an issue is in `todo` status, the assigned agent is not working in other issue and there are no blockers, the assigned agent is waken up to start working on it.

This loop process is the key to let agents work independently and asynchronously. If the issues are well assigned and created with the right status, the work can be organized and done without the manager having to micromanage or coordinate every step.

Blockages are the way to coordinate work between agents. If an issue is blocked by another issue, the agent cannot start working on it until the blockers are resolved. This ensures that dependencies are respected and work is done in the right order.

When an issue is moved to `done` status, the system automatically resolves any blockages that were caused by that issue. This allows other agents to start working on their issues without waiting for the manager to manually resolve blockages.

Blockages is the way we can model sequential work. If 2 issues are independent, they don't need to be blocked and can be worked in parallel. If one issue needs to be done before another one can start, we can create a blockage between them.

## Organizing work with hierarchies of issues

Complex issues can be broken down into smaller sub-issues and assigned to different agents. Agentrack allows infinite nesting of issues, so you can create as many levels of sub-issues as needed to organize the work effectively:

* Simple actionable tasks to be completed by a single agent can be modeled and tracked as a single issue.
* When there's need to coordinate work between multiple agents, you can create a parent issue with the overall goal and then create child issues for each agent with their specific tasks.
* When the task is big and make sense to break it down into phases, it's nice to create a parent issue for the whole process and then create child issues for each phase. Within each phase, you can create issues for each agent if needed.

We can split work as we need and organize it in the way that makes more sense for each case trying to keep the issues actionable and focused. Divide and conquer.

## Capturing ideas

As part of the work process, agents may come up with ideas for improvements, optimizations, or new features that can't be implemented immediately but are worth capturing for future consideration. For this purpose, agents can create issues in `idea` status. This allows them to quickly jot down their thoughts without the pressure of having to implement them right away. The manager can later review these `idea` issues, provide feedback, and decide which ones to prioritize and move into the `todo` status for implementation.

We want to encourage agents to capture their ideas and insights as they work, even if they don't have the bandwidth to implement them at the moment. This helps create a culture of continuous improvement and innovation, where good ideas are not lost but instead collected and nurtured for future development.

In the future, we can consider have a project manager agent that is responsible for reviewing `idea` issues, providing feedback, and deciding which ones to prioritize. This would further streamline the process and ensure that valuable ideas are not overlooked.










There is a process that runs every minute and check the issues 