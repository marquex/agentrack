---
name: agentrack-workflow
description: "Instructions on how to use the agentrack library efficiently as the main tool to manage and track work for agents. Use this skill when interacting with agentrack, when creating or starting new work, to ensure that the work is well organized, tracked and coordinated with other agents. "
---

All the work we do as agents should be tracked in agentrack issues. This is the main tool we have to organize, track and coordinate our work. We need to capture all the work in agentrack issues, and use it to coordinate with other agents and track the progress of our work.

The goal is to have clear workflows for letting agents work independently on issues and collaborate with each others to implement features, fix bugs and achieve milestones.

## The work loop

There is a process that runs every minute checking the existing issues. If an issue is in `todo` status, the assigned agent is not working in other issue and there are no blockers, the assigned agent is waken up to start working on it.

This loop process is the key to let agents work independently and asynchronously. If the issues are well assigned and created with the right status, the work can be organized and done without the manager having to micromanage or coordinate every step.

Blockages are the way to coordinate work between agents. If an issue is blocked by another issue, the agent cannot start working on it until the blockers are resolved. This ensures that dependencies are respected and work is done in the right order.

When an issue is moved to `done` status, the system automatically resolves any blockages that were caused by that issue. This allows other agents to start working on their issues without waiting for the manager to manually resolve blockages.

Blockages is the way we can model sequential work. If 2 issues are independent, they don't need to be blocked and can be worked in parallel. If one issue needs to be done before another one can start, we can create a blockage between them.

The work loop also check for new mentions in issue comments for each agent. If an agent gets new mentions, it will be waken up to check the comments and address any questions or discussions that require their attention.

## Organizing work with hierarchies of issues

Complex issues can be broken down into smaller sub-issues and assigned to different agents. Agentrack allows infinite nesting of issues, so you can create as many levels of sub-issues as needed to organize the work effectively:

* Simple actionable tasks to be completed by a single agent can be modeled and tracked as a single issue.
* When there's need to coordinate work between multiple agents, you can create a parent issue with the overall goal and then create child issues for each agent with their specific tasks.
* When the task is big and make sense to break it down into phases, it's nice to create a parent issue for the whole process and then create child issues for each phase. Within each phase, you can create issues (grandchild ones) for each agent if needed.

We can split work as we need and organize it in the way that makes more sense for each case trying to keep the issues actionable and focused. Divide and conquer.

Within a parent ticket, don't leave the creation of the child issues for later, as the work loop won't notify you automatically when the the child issues are done. If you want to be notified when the child issues are done, you need to create a child issue assigned to you with a blockage for each child issue, so when they are done the blockage is resolved and you get notified.

## Capturing ideas

As part of the work process, agents may come up with ideas for improvements, optimizations, or new features that can't be implemented immediately but are worth capturing for future consideration. For this purpose, agents can create issues in `idea` status. This allows them to quickly jot down their thoughts without the pressure of having to implement them right away. The manager can later review these `idea` issues, provide feedback, and decide which ones to prioritize and move into the `todo` status for implementation.

We want to encourage agents to capture their ideas and insights as they work, even if they don't have the bandwidth to implement them at the moment. This helps create a culture of continuous improvement and innovation, where good ideas are not lost but instead collected and nurtured for future development.

In the future, we can consider have a project manager agent that is responsible for reviewing `idea` issues, providing feedback, and deciding which ones to prioritize. This would further streamline the process and ensure that valuable ideas are not overlooked.

## Communication and collaboration

Agents should use the issue comments to communicate and collaborate with each other. Comments are a great way to ask questions, share updates, provide feedback, and discuss any blockers or challenges that arise during the work process. By keeping the communication within the context of the issue, it helps maintain a clear and organized record of the discussions and decisions related to that specific task.

When an agent is working on an issue and encounters a question or needs input from another agent, they can add a comment mentioning the relevant agent (e.g., @agent-name) to get their attention. This allows for asynchronous communication and helps ensure that the right people are involved in the discussion.

In the work loop, there will be a check for new mentions for each agent. If an agent has new mentions, it will be waken up to check the comments and respond if needed. This way, agents can stay informed about any discussions or questions that require their attention without having to constantly check the issues manually.

When an agent finish handle the mention and address the question or discussion, they can mark the mention as read, so they are not returned by default in the command `mentions list` and the agent won't be waken up again for that mention.

## Working on a issue

Agents will work on issues that are assigned to them, in `todo` status and without any blockages.

When an agent starts working on an issue, it should update the status to `in-progress` to indicate that it's being worked on. This helps the manager and other agents understand the current state of the issue and its parent. 

When the agent finishes working on the issue with a successful outcome, it should update the status to `done` and add a comment summarizing what was done. Setting the status to `done` will automatically resolve any blockages that were caused by that issue, allowing other agents to start working on their issues without waiting for the manager to manually resolve blockages.

If the outcome is not successful and there was some blocker that couldn't be resolved, the agent should add a comment describing the current state, blockers, and remaining work. Then it should update the status back to `todo` and reassign it to the manager to review the blockers and decide how to proceed. This way, the manager will pick up the issue again through the work loop.

## Development flow

When working on a change, a fix or a new feature, we always follow the same flow to be sure that the work is well tracked and the quality is good:

1. Create a specification of what's needed to be done for the task. That specification can be discussed with the agents that are going to work on it to be sure everyone is aligned.
2. Break down the task into smaller, manageable issues if necessary.
3. For every actionable issue, there should be a specification and then 2 or 3 issues created for it:
    3.1 An implementation issue to complete the task.
    3.2 A validation issue to make sure the task is done correctly and works as intended.
    3.3 A documentation issue to update the docs, create a new build and release a new version if needed.