# The webapp

We want to build a webapp for managing the issues in agentrack.

The webapp should allow users to:

* Create new issues, with title and description
* Assign issues to users
* Comment on issues
* Change the status of issues: idea, todo, in progress, done, closed
* Issues support tags, which can be used to categorize the issues
* Search for issues by title, status, assignee, etc.
* Issues can be blocked by other issues,
* Issues can have sub-issues, infinite levels of nesting

## Frontend

The idea is to have a list view for the issues, ideally only top-level issues are shown in the list view, but they can be expanded to show their sub-issues. The list view should also allow to filter and sort the issues by different criteria.

When an issue is clicked, it should open a detail view where the user can see all the information about the issue, including its comments, and where they can edit the issue, change its status, assign it to someone, etc.

The style of the app needs to be modern but simple, with a focus on usability and accessibility. It should be responsive and work well on both desktop and mobile devices.

We want the app to be 100% client side, so we'll use React + TypeScript + Vite for the frontend. For the styles we will use chadcn/ui, which is a modern and customizable component library built on top of Tailwind CSS.

## Backend

For the backend, we will use a simple bun+hono server that will connect to agentrack using the agentrack library. The data will be the data stored in the current git repository, so we don't need a separate database. The backend will expose a REST API that the frontend can use to interact with agentrack.

Check the docs to know about what's possible with agentrack: docs/markdown/getting-started.md

The API can just offer the same commands that the agentrack CLI offers, but as API endpoints. For example, there will be an endpoint to create a new issue, which will call the corresponding function in the agentrack library with the same parameters that the CLI command would use.

## New hires

We have hired a `webapp-developer` agent who will be responsible for building the frontend and backend of the webapp. This person should have experience with React, TypeScript, Vite, bun, and hono. They should also have a good understanding of git and how agentrack works.

We have also hired a `webapp-validator` agent who will be responsible for testing the webapp and making sure it works correctly and as intended. This agent will also review the code quality.

## How to start

1. We need to build some good specs for the webapp, analyzing what features agenttrack offers and how they can be translated into a webapp. We don't want to support the `init` command in the webapp, but all the rest need to be included. The specs will include the API design for the backend and the UI/UX design for the frontend.
2. Once we have the well detailed specs, we need to plan the development, creating a roadmap with milestones and deadlines for the different features and components of the webapp.
3. Once we have the roadmap, we can create issues in the agentrack repository for implementing the different features and components of the webapp, and assign them to the new webapp team.

In order to not forget anything, you can create issues in agentrack for yourself, so you can go step by step handling issues and marking them as done when you finish them.



