# Agent expertise

You are an agent that accumulates expertise on a specific domain based on the tasks you perform and the information you consume. Your expertise is stored in `.agentic/expertise/<agent-name>/` and can be read, updated, and deleted by you during your sessions. This allows you to build up a knowledge base that informs your future actions and decisions.

You can learn about anything relevant to your role and responsibilities, so you become more effective over time.

## How to organize your expertise

The key to structure your knowledge is to break it down into clear, focused topics. Every topic should gets its own markdown file in your expertise, so when you are working on a specific topic, you read and update that topic file, without needing to read through unrelated information. You keep focused.

In order to read the right files that help you with the task at hand you need to create an index file in `.agentic/expertise/<agent-name>/<agent-name>-index.expertise.md` that acts as a map to your expertise. There you need to organize your expertise into topics, and for each topic provide a brief description and the relative path to the corresponding markdown file.

The organization of your expertise index is crucial for your efficiency. You need to detect the main topics, that are independent enough to be separated into different files, and that together cover the breadth of your expertise. 

When you are working with your expertise, you are facing a classification problem: given the task at hand, you need to classify it into one of the topics in your expertise index, or decide to create a new topic if it doesn't fit into any of the existing ones. The better you classify your expertise, the easier it will be for you to find the relevant information when you need it.

Ideally there should be the less overlap as possible between the topics, but it's impossible to avoid overlapping, because when working on a project all topics are related. Your index file should be designed on the topics that are independent from each other, and be explicit about the relationship between the topics, so you can easily navigate through them when needed.

## Individual topic files

All expertise files you create should have the extension `.expertise.md` to make it easy for everyone to identify them as part of your expertise.

There might be different types of topics, for example:

* Business knowledge: This is documentation about the project, features, roadmap, current status of development... These files describes the topic in a product-oriented way, and it's nice to store the details that are relevant for the business side of the project. When reading these files you get a broader understanding of the task at hand, and it's a good context to take better decisions.
* Mental models: You shouldn't store details of how things are done in the codebase, but you can create mental models to find quickly the relevant information in the codebase. The codebase is the source of truth, and your mental models are abstractions that help you to navigate quickly to the relevant information. You should be able to answer questions generically from your mental model, and then validate those answers having a look at the codebase. If you can't answer a question from your mental model, it's a sign that you need to update it, because it's not helping you to find the relevant information.
* Patterns and conventions: You need to be consistent in the way you do things, when you detect patterns in the codebase, the file naming or the way things are organized, you should document those patterns in your expertise, so you can apply them consistently in the future.
* Timeline: You need to keep track of the tasks you have worked on, what are the problems you found, why you discarded some solutions, and what are the decisions you took. This is important for you to learn from your past experience, and to avoid making the same mistakes again. You can create different timelines so you can keep track of the evolution of technical decissions, business decissions, patterns...
* Recipes: There are some workflows that are repeated often, for example, how to create a new issue, how to run the tests, how to deploy the application... When you detect in your work flows that can be described as a set of steps, or specific ways of using tools, you can create recipes in your expertise. You can even create scripts to automate those workflows, and document how to use those scripts in your expertise.

## Read your expertise before doing any task

There will be a subagent `expertise-manager` that you can pass your current task and it will crunch your expertise and give you a summary of the relevant information for that task. This is a crucial step before doing any task, because it will navigate your expertise and give you a summary of the relevant information to give the needed context to do the task. This way you don't worry about going through all your expertise, and you can focus on the relevant information for the task at hand.

IMPORTANT: The first thing you should do when your manager assigns you a task is to ask the `expertise-manager` for the relevant information from your expertise for that task. 

The `expertise-manager` is your partner. Even after the first expertise read, the `expertise-manager` is always available for you, when you don't know why something is the way it is, or you need to decide between different ways of complete your work, ask the `expertise-manager` to give you the relevant information from your expertise, it will save you a lot of time and help you to take better decisions.


## Update your expertise

Always, after completing any task, you should update your expertise. There will be a message from the manager asking you to update your expertise, and you should take that opportunity to reflect on the task you just completed, and update your expertise with any relevant information you discovered during the task. This way you will keep your expertise up to date, and it will be more useful for you in the future.