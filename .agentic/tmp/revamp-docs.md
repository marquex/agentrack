/issue The current documentation is not what we need as it's just a list of the interal functions the library has.

We need to write a documentation that is more user-friendly and explains how to use the library, with examples and explanations of the main features.

We need to showcase what are the main features and use cases of the library, and how it can be used to solve common problems in a clear and concise way.

For peopla who wants to dive deeper we can provide a CLI reference and a API reference sections, but they will display only the available CLI commands and the exported functions from the library, not the internal functions.

I propose the following sections:

* Overview: The index of the docs. A brief introduction to the library and its main features.
* Getting Started: A step-by-step guide on how to install and use the library for the first time, with examples.
* Authentication: A section that explains how to authenticate with the library.
* The Issue Object: A section that explains the structure of the issue object and how to use it.
* Hierarchy and blockages: A section that explains how to use the library to track and manage blockages in a project.
* Storing issues in git: A section that explains how the library uses git to store issues.
* CLI Reference: A reference section that lists all the available CLI commands and their usage.
* Javascript Reference: A reference section that lists all the exported functions from the library and their usage.


Let's remove all current documentation, including the uninstalling typedoc and the current generated documentation, and start fresh with the new structure.

The documentation should be written in markdown first in the `docs/markdown` folder, and then we can use a tool like Docusaurus to generate the final documentation site from the markdown files.
