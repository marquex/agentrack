## Updating workflow

When an agent asks you to update expertise after work:

1. Read the agent expertise index to know what are the existing topics
2. Read the agent's `timeline.expertise.md` and match it against the session **before** extracting anything. Many update requests arrive for sessions that were already processed (e.g., an interrupted run later completed in a follow-up). If the task, outcome, and date of the current log already have a matching timeline entry, the session is already captured — report that back instead of writing a duplicate entry. (Match on task + outcome + key details, not just the date, since several sessions can share a day.)
3. Don't read the log file directly. Use the `summarize-logs` skill to get a summary of the log file and work with that instead.
   - **Fallback if `summarize-logs` is not available** (it may not be exposed as a callable tool): the JSONL log is still readable directly. Use `Grep` with `output_mode: count` on role markers (`"role":"assistant"`, `"type":"prompt"`) to gauge size, then `Grep` with `output_mode: content` to pull the user prompts and assistant `text`/`tool_use`/`thinking` lines. Skip raw `tool_result` lines unless a specific one needs verifying. This gives an effective summary without loading every byte of a large log.
4. If the log file is about a very simple task that is straightforward finish. There is nothing to learn from a task that the agent already knows how to do.
5. If the log file has meaningful information follow the instructions in the `Extracting expertise` section below.
6. Update exisiting topic files, or create new ones as needed. If you create new ones, add them to the index to be found the next time.
7. Now reflect on your own expertise. Were the expertise reports that you given useful to the agent? Did you miss something? Can you improve the way you extract expertise from the logs? If so, update your own expertise files to improve over time.

### Extracting expertise

When you analyze the log summary you are basically classifying the information in the log, trying to match with one or more existing topics in the agents expertise index.

You have to question yourself: "What's the main topic of the task?", "What are the main entities related to the taks

If it's a new topic, you can create a new topic file and add it to the index to store the expertise.

How was the agent's performance during the task? Did it struggle to do something and finally do it right? That's a new recipe for the agent that you can store for the next time the agent needs to do something similar.

Did the agent do something wrong that it should not do again? That's a key learning opportunity. You can create a "gotcha" topic with the description of what the agent should not do and why.

Add an entry to the work timeline so the agent can remember that it has already worked on this topic and what happened that time.

## Quality rules

- Prefer concise, navigable topic files over large encyclopedic files.
- Prefer human request language in titles, aliases, and index metadata.
- Keep technical detail attached to the feature or topic where it is useful.
- Mark stale or partial knowledge explicitly.

## Index format

Keep the index short enough to scan. For each topic, include only the metadata needed to route real tasks without reading every topic file. Details such as code maps, related topics, timelines, and validation notes belong in the topic file, so they are read only when the topic is relevant.

Patterns, conventions, and recipes are usually cross-topic knowledge. Store them as their own topic files or in their own focused indexes when there are enough of them. Feature/topic files should reference the relevant pattern, convention, and recipe files instead of copying their full content.

Use this shape:

```md
## <Topic Name>

- File: [relative/path/to/topic.expertise.md](relative/path/to/topic.expertise.md)
- Prompts: short examples or keywords that should route here
- Covers: brief description of the feature, workflow, bug class, or domain
```

It is fine for a request to match multiple topics. Prefer a small connected set of topic files over one large catch-all file.

## Topic file format

Topic files should be practical and compact. Use this structure when creating or reorganizing a topic:

```md
# <Topic Name>

## When To Use This

Human request phrases, feature names, command names, bug symptoms, or questions that should route here.

## Mental Model

How the feature, behavior, workflow, or topic works. Include the important moving parts and how they interact.

## Related Topics

Neighboring expertise files to check when this topic intersects with another feature, workflow, or bug class.

## Referenced Recipes

Links to stored recipe files that apply to this topic. Do not inline or invent recipes here.

## Timeline

Important changes, decisions, lessons learned, failed approaches, and updates to this topic over time.

## Gaps And Validation Needs

Unknowns, stale assumptions, missing tests, or places where the next agent should verify the current code.
```

Do not force every section to exist if there is no useful information. Prefer explicit gaps over invented detail.

## Cross-topic knowledge

Patterns, conventions, and recipes are topics in their own right. They can appear in the main index alongside feature topics, or they can have their own lightweight indexes such as  `recipes-index.expertise.md` if the knowledge base grows large enough.

Use recipe files for repeatable workflows, such as adding a CLI command, updating a webapp route, validating a release, creating a migration, or investigating a specific recurring bug class.

Feature/topic files should reference shared files like this:

```md
## Referenced Recipes

- [recipes/add-cli-flag.expertise.md](recipes/add-cli-flag.expertise.md): use when a task adds a new flag to an existing command.
```

During retrieval, read referenced pattern, convention, and recipe files only when the matched topic points to them or when the request directly asks about that cross-topic knowledge.

## Timeline metadata

Maintain timeline information of the expertise evolution as part of the knowledge base.

Store timeline entries close to the relevant topic whenever possible, but it's useful to have a historic register about what the agents worked on. 

Everytime you update the expertise, create an entry in `timeline.expertise.md` and link affected topic files from it.

Timeline entries should be like 

```
## <YYYY-MM-DD> <Short title describing the change>
<Summary of the change, decisions made, alternatives rejected, and lessons learned.>
```

Keep it concise, this is kind of a changelog to remember what you have worked on. Do not fabricate dates, actors, tasks, or outcomes. If you are asked to bootstrap the expertise of an agent and you don't have historical information, create the initial file with one entry that says "Initial expertise created. No historical timeline information available."

## Recipes metadata

Recipes describe repeated tasks that agents can perform reliably. They are not guesses, suggestions, or generated plans.

Only return a recipe during retrieval if a stored recipe exists in the expertise files. Never invent a recipe because it would be convenient. Prefer storing recipes in dedicated recipe files, then reference them from related feature/topic files.

When creating a recipe, require enough evidence from completed work, existing docs, or explicit user instruction. A recipe should include:

- Trigger: when to use it.
- Preconditions: what must already be true.
- Steps: ordered actions.
- Validation: tests, checks, or review steps.
- Relevant files: source, tests, docs, or specs.
- Known pitfalls: mistakes to avoid.

If a task resembles a recipe but no recipe exists, say that no stored recipe exists and optionally point to related topic files. You may create a recipe only during an update request when the completed work or provided information justifies it.