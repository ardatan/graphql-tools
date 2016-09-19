<!--
  Thanks for filing a pull request on Apollo Client!

  We are using standard-version because it makes it easier to keep track of relevant changes when we publish releases, and because it removes the need for a CHANGELOG.md file, which often leads to merge conflicts in pull requests.
  (More info about the formating below)
  
  If you're not sure how exactly to format the commit message, don't worry about it. Just make the PR, and we'll fix it for you when we merge it.

  Finally, please look at the following checklist to ensure that your PR
  can be accepted quickly:
-->

TODO:

- [ ] Make sure all of the significant new logic is covered by tests
- [ ] Rebase your changes on master so that they can be merged easily
- [ ] Make sure all tests and linter rules pass

<!--
Commmits Formatting: (https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md)
  ---------------------
  A commit message consists of a **header**, **body** and **footer**.  The header has a **type**, **scope** and **subject**:
  <type>(<scope>): <subject>
  <BLANK LINE>
  <body>
  <BLANK LINE>
  <footer>

  ## Header

  The **header** is mandatory and the **scope** of the header is optional.

  If the type is `feat`, `fix` or `perf`, it will appear in the changelog. 
  Suggested prefixes are `docs`, `chore`, `style`, `refactor`, and `test` for non-changelog related tasks.
  However if there is any [BREAKING CHANGE](#footer), the commit will always appear in the changelog.

  The subject contains succinct description of the change:

  * use the imperative, present tense: "change" not "changed" nor "changes"
  * don't capitalize first letter
  * no dot (.) at the end

  ## Footer

  The footer should contain any information about **Breaking Changes** and is also the place to
  reference GitHub issues that this commit **Closes**.

  **Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

  For Example:
  * feat(autopublish): add 'autopublishMutationResults' function

    when enabled, after each mutation, the result will be published using the mutation name.

  * fix(mock): error handling when preserveResolvers = true

    Closes #149

  * chore: remove mockServer

    BREAKING CHANGE: remove mockServer which got deprectaed on version 0.4.0
-->
