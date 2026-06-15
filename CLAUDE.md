# Agentrack - An agent-first issue tracker

Agentrack is a CLI tool that agents can use to track the work on a project, enabling long term development and coordination among different agents.

The name comes from `agent`, as it's an agent-first tool, and `track` as it allows to track the work done in a project.

The work in this repository has 3 different sides:

* Agentrack CLI tool: The core of the project, that allows to use the `agt` command in the CLI that can be installed through NPM
* Agentrack typescript library: Reusing the CLI library code, the agentrack library also expose a typescript API, so anyone can import agentrack in their code and call their methods programmatically
* Webapp: A web UI to let humans visualize and manage issues in agentrack

## dogfooding

This project use agentrack as their own issue tracker. It stores the issues in the `.agentrack/` folder. Also it can boot up new agentrack instances in the `validation/` folder to run E2E tests and validate the changes. 