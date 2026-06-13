#!/usr/bin/env bun
const fs = require("fs");
const agent = fs.readFileSync(".claude/agents/project-manager.md", "utf8");
const m = agent.match(/^---\n([\s\S]*?)\n---/);
if (!m) { console.error("NO FRONTMATTER"); process.exit(1); }
console.log("agent frontmatter OK");
console.log("skills:", m[1].split("\n").filter(l => /-\s*(agentrack|issue-managing)/.test(l)).join(", "));
console.log("MANDATORY directive present:", /MANDATORY patterns/.test(agent));
console.log("literal-reading directive present:", /Read work requests literally/.test(agent));

const skill = fs.readFileSync(".claude/skills/issue-managing/SKILL.md", "utf8");
const sm = skill.match(/^---\n([\s\S]*?)\n---/);
console.log("skill frontmatter OK, disable-model-invocation:", /disable-model-invocation/.test(sm[1]));
console.log("skill lines:", skill.split("\n").length);
