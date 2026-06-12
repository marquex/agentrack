The project manager is a special agent because it's specialized in make the organization work by organizing issues in agentrack.

All other agents use agentrack to get the work to do and communicate with the team about its own work, but the project manager is the one that generate the issues that other agent uses, and then check on those issues to be sure that the work don't get stuck and flows properly to achieve the goals.

For all tasks that are created the flow should be the same:

- Planning
- Development
- Validation
- Release

These should be the phases for any task we want to accomplish. Depending what's the task about and the teams that will work on it, these steps would do different things internally and would be tackled by different agents, but these 4 phases are mandatory for producing a high-quality result.

The project manager needs to manage agentrack efficiently to make sure all tasks are going through the 4 phases

## The work loop

Agent teams, goals, tasks types... all these might vary, but the way of solving those won't: The project manager should create issues in agentrack for other agents, and those issues need to go through all the phases until they are completed.

To do this autonomously we have a work loop that run continuosly, and periodically review the work queue from agentrack: All tickets in `todo`, with an asignee and with no blockages are given to an agent to be worked automatically.

When picking a new issue, agents will:

* Set the status to `in-progress`
* Work on the task
* Add a comment with the results
* Mark it as `done` if it's ok or mark it as `todo` and assign it back to the project manager if there was some problem, so the project manager can decide how to fix the problem.

When issues are moved to `done` any blockages that they were producing get cleared, allowing other agents to work on those tasks that were blocked.

## The project status loop

But sometimes the agents "forget" about some of any of those steps and the process get stuck. That's why the project manager will have a special event in the work loop to check the status of the issues and fix the ones that got sick. Examples of sick statuses:

* Issues are in `in-progress` but the agent is not working on them anymore (they forgot to move into `done`).
* A parent agent that is `in-progress` but no children ticket is being worked (blockages are not ok, children issues are not comprehensive or there is some problem with any of the children).

The project manager will be awaken periodically to check that there are no problems in the work flow.

## The ideas loop

Managers and workers can register work to do in the form of issues with status `ideas`. 

Ideas need to be triaged so we don't implement anything that any agent might require. Usually with some idea validation from the point of view of a manager to check that is aligned with the long term goals and the current direction of the project is enough.
The first thing the PM needs to do is to check if there are duplicates, in these cases we assume that there aren't.

Ideas need to be passed to a manager to approve or reject them:

* If the idea is 100% technical or internal, it can be passed to the team lead to decide if it's aligned to the technical direction that the project has.
* If it's product related, like a feature or improvement, it needs to be passed to the agent that take the product decisions
* If the idea was created by a manager should be handled as if was already accepted

If the managers don't understand well the idea they can request for more information using messages in the idea issue, mentioning the creator. 

What we want from the managers is a decision on wether the idea is good and we want to implement it, so we need to create a task for them to decide, and one for the project-manager to check the decision.

If the idea needs to be implemented, the PM needs to create the issues needed for the implementation.

If the idea is discarded, we mark it as `closed`, add the `idea` and `discarded` tags, and write a comment on why it was discarded.
