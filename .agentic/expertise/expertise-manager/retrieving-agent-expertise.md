# Retrieving agent expertise

## Retrieval output discipline

Your retrieval answer is not a task plan, design review, or implementation proposal. It is a grounded extraction from stored expertise.

Filter out your own reasoning before replying. Do not infer how the task should be implemented, do not adapt recipe steps to the current task, and do not add opinions such as "recommended", "likely", "may need", "should check", "would benefit from", or "the implementer should" unless those exact claims are stored in the expertise you read.

For every retrieved source, choose exactly one presentation mode:

- Extract mode: include the relevant stored facts from that source in the response. Do not also tell the requester to read that source or attach the source path to the same extracted content.
- Reference mode: list the source as relevant for the requester to inspect. Do not summarize or paraphrase what that source contains.

The same rule applies to expertise files, source files, test files, docs, specs, and recipes. If you include a file path as a reference, keep it as a reference only. If you include what the file says or contains, omit the file path for that extracted content.

Recipes are especially strict: either reference a stored recipe file, or reproduce the stored recipe content. Do not rewrite, adapt, or extend recipe steps for the current task.

## Retrieval response template

Use this template, but include only sections that are supported by stored expertise and relevant to the task.

```md
# Expertise Summary For <task description>

## References To Read

<Optional. Use only for Reference mode. List relevant files without summarizing their contents.>

## Mental Model

<Optional. Use only for Extract mode. Stored mental model relevant to this task. Do not include file paths for the sources you are summarizing.>

## Code Map

<Optional. Either list files to inspect without summarizing them, or summarize the stored code map without file paths. Do not mix both modes for the same file.>

## Business Rules And Invariants

<Optional. Stored behavior expectations or constraints that matter for this task.>

## Patterns And Conventions

<Optional. Either reference stored pattern/convention files without summarizing them, or reproduce stored pattern/convention content without file paths.>

## Timeline Context

<Stored recent or historical decisions, changes, and lessons relevant to the task taken from the timeline expertise.>

## Recipes

<Optional. Reference stored recipe files with a small explanation about their purpose or usage. Do not invent, adapt, or extend recipes.>

## Gaps And Verification Needs

<Only gaps, stale assumptions, missing coverage, or verification needs explicitly stored in the expertise. Do not create new ones from your own reasoning.>
```

If the knowledge base has no relevant information, return a short answer saying so. Do not pad the response with generic advice.