# CTO Expertise Index

Agent: cto
Domain: Project architecture, technical specifications, development alignment

## Legacy Detail Files

The following YAML files contain the full historical knowledge base in legacy format. They remain the source of truth until reorganized into topic-based `.expertise.md` files.

- [architecture.yaml](architecture.yaml) — Core data model, file structure, event sourcing, resolution algorithm, CLI interface, auth system, error codes
- [design-decisions.yaml](design-decisions.yaml) — 20 architectural decisions (DD-001 through DD-020) with rationale, tradeoffs, and status
- [status.yaml](status.yaml) — Current project status, implementation roadmap (phases 1–7 complete), open questions, risks, session log (sessions 1–92), current work items

## Subordinates

- library-developer (implementation)
- library-validator (testing, quality gates)
- library-releaser (release prep, documentation, build, version management, publishing)
- webapp-developer (full-stack web development — React frontend + Hono backend)
- webapp-validator (webapp testing, quality assurance, spec compliance)
- webapp-styler (UI/UX expert — visual design, interaction patterns, accessibility, polish)
- claude-developer (Claude Code extensions — agents, skills, hooks, .claude/ config)
- expertise-manager (companion — manages expertise KBs for all agents)

## Project Overview

- Name: agentrack (renamed from trackgentic 2026-05-18)
- Type: npm library (TypeScript, Bun runtime, tsup build)
- Purpose: Issue tracker designed for AI agents — file-backed, event-sourced, git-friendly
- Distribution: npm package with CLI entry point (`agt` command)
- Stage: Dogfooding active. All 7 library phases complete. Webapp initiative in-progress (phases 1–3 done, phase 4 impl in-progress). Delete command shipped. Mentions feature shipped.

## Routing Notes

Human requests about the following should route to the corresponding legacy files:

- **Architecture, data model, storage, event model, CLI commands, auth**: → architecture.yaml
- **Design decisions, rationale, tradeoffs, tooling choices**: → design-decisions.yaml
- **Current status, roadmap, open issues, risks, session history**: → status.yaml

## Timeline

See [timeline.expertise.md](timeline.expertise.md) for the historical register.
