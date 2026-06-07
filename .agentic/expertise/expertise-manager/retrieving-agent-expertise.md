# Retrieving agent expertise

You need to report on what's stored in the agent folder `.agentic/expertise/<agent-name>`.

IMPORTANT: DO NOT TRY TO ACCESS OUTSIDE of the agent folder for the report.

## How to navigate the expertise

1. Start by reading the index `.agentic/expertise/<agent-name>/<agent-name>-index.expertise.md`
2. From the index, read any linked document that belongs to a topic that might be minimally related with the task at hand
3. Once you read the topic file, assess if there is any content in it that can be helpful for the task to complete, and include it in your final report
4. Return the concise report following instructions in the section `Retrieval response template`

IMPORTANT: You need to be fast, do not process much the expertise content, just include the pieces as they are stored in the expertise

## Retrieval output discipline

Your retrieval answer is not a task plan, design review, or implementation proposal. It is a grounded extraction from stored expertise.

All the information you report need to be extracted from the agent's stored expertise. Do not invent, do not infer, do not adapt, and especially DO NOT SEARCH other locations for expertise that is relevant but not stored.

Be concise and fast in your responses.

If the expertise you have access to does not contain relevant information, report that clearly and concisely and finish, instead of trying to fill in the gaps with your own reasoning.

Filter out your own reasoning before replying. Do not infer how the task should be implemented, do not adapt recipe steps to the current task, and do not add opinions such as "recommended", "likely", "may need", "should check", "would benefit from", or "the implementer should" unless those exact claims are stored in the expertise you read.

For every retrieved source, choose exactly one presentation mode:

- Extract mode: include the relevant stored facts from that source in the response. Do not also tell the requester to read that source or attach the source path to the same extracted content.
- Reference mode: list the source as relevant for the requester to read and a concise summary of why it needs to be read.

Recipes are especially strict, reference them with a description on when to use it.

## Retrieval response template

a. If there is no expertise on the task at hand report with the concise message `There is no previous expertise for this task.` exactly, and finish.

b. If you have found related information, use this template below to report. Include only sections that are supported by stored expertise and relevant to the task.

```md
# Expertise Summary For <task description>

## References To Read

<Optional. Use only for Reference mode. List relevant files without summarizing their contents.>

## Mental Model

<Optional. Use only for Extract mode. Stored mental model relevant to this task. Do not include file paths for the sources you are summarizing.>

## Business Rules And Invariants

<Optional. Stored behavior expectations or constraints that matter for this task.>


## Timeline Context

<Stored recent or historical decisions, changes, and lessons relevant to the task taken from the timeline expertise.>

## Recipes

<Optional. Reference stored recipe files with a small explanation about their purpose or usage. Do not invent, adapt, or extend recipes.>

## Gaps And Verification Needs

<Only gaps, stale assumptions, missing coverage, or verification needs explicitly stored in the expertise. Do not create new ones from your own reasoning.>
```

If there is no expertise for filling some template section, don't include the section in the returned report.

## Quality rules

- Ground every retrieval answer in stored expertise you actually read.
- During retrieval, report stored expertise only. Do not include your own implementation advice, product opinions, inferred task plan, or speculative validation checklist.
- For each source in a retrieval answer, choose extract mode or reference mode. Never both.
- Do not adapt recipes, infer missing steps, or create task-specific gaps unless that information is explicitly stored in the expertise.
- Never invent recipes, timelines, file locations, business rules, or decisions.
- Be concise and fast in your response, do not include your own thoughts, suggestions, or what you think would be the next steps.