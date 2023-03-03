# Contributors

Thank you for contributing!

We have prepared a short guide so that the process of making your contribution is as simple and clear as possible. Please check it out before you contribute!

## How can I contribute...

* [Contribute Documentation:green_book:](#contribute-documentation)

* [Contribute Code :computer:](#contribute-code)

* [Provide Support on Issues:pencil:](#provide-support-on-issues)

* [Review Pull Requests:mag:](#review-pull-requests)

## Contribute documentation

Documentation is a super important, critical part of this project. Docs are how we keep track of what we're doing, how, and why. It's how we stay on the same page about our policies and how we tell others everything they need to be able to use this project or contribute to it. 

Documentation contributions of any size are welcome! Feel free to contribute even if you're just rewording a sentence to be more clear, or fixing a spelling mistake!

**How to contribute:**

Pull requests are the easiest way to contribute changes to git repos at GitHub. They are the preferred contribution method, as they offer a convenient way of commenting and amending the proposed changes.

- Please check that no one else has already created a pull request with these or similar changes
- Use a "feature branch" for your changes. That separates the changes in the pull request from your other changes and makes it easy to edit/amend commits in the pull request 
- Make sure your changes are formatted properly and consistently with the rest of the documentation
- Re-read what you wrote, and run a spellchecker on it to make sure you didn't miss anything
- If your pull request is connected to an open issue, please, leave a link to this issue in the `Related issue:` section
- If you later need to add new commits to the pull request, you can simply commit the changes to the local branch and then push them. The pull request gets automatically updated

**Once you've filed the pull request:**

- Maintainers will review your pull request
- If a maintainer requests changes, first of all, try to think about this request critically and only after that implement and request another review
- If your PR gets accepted, it will soon be merged into the main branch. But your contribution will take effect only after the release of a new version of the action and updating the major tag
> Sometimes maintainers reject pull requests and that's ok! Usually, along with rejection, we supply the reason for it. Nonetheless, we still really appreciate you taking the time to do it, and we don't take that lightly :heart:

## Contribute code

We like code commits a lot! They're super handy, and they keep the project going and doing the work it needs to do to be useful to others.

Code contributions of just about any size are acceptable!

The main difference between code contributions and documentation contributions is that contributing code requires the inclusion of relevant tests for the code being added or changed. Contributions without accompanying tests will be held off until a test is added unless the maintainers consider the specific tests to be either impossible or way too much of a burden for such a contribution.

**How to contribute:**

Pull requests are the easiest way to contribute changes to git repos at GitHub. They are the preferred contribution method, as they offer a convenient way of commenting and amending the proposed changes.

- Please check that no one else has already created a pull request with these or similar changes
- Use a "feature branch" for your changes. That separates the changes in the pull request from your other changes and makes it easy to edit/amend commits in the pull request
-  **Run `pre-checkin` script to format, lint, build and test changes**
- Make sure your changes are well formatted and that all tests are passing
- If your pull request is connected to an open issue, please, leave a link to this issue in the `Related issue:` section
- If you later need to add new commits to the pull request, you can simply commit the changes to the local branch and then push them. The pull request gets automatically updated

**Learn more about how to work with the repository:**

- To implement new features or fix bugs, you need to make changes to the `.ts` files, which are located in the `src` folder
- To comply with the code style, **you need to run the `format` script**
- To lint the code, **you need to run the `lint:fix` script**
- To transpile source code to `javascript` we use [NCC](https://github.com/vercel/ncc). **It is very important to run the `build` script after making changes**, otherwise your changes will not get into the final `javascript` build
- You can also start formatting, building code, and testing with a single `pre-checkin` command

**Learn more about how to implement tests:**

Adding or changing tests is an integral part of making a change to the code. 
Unit tests are in the `__tests__` folder, and end-to-end tests are in the `workflows` folder, particularly in the [versions.yml](https://github.com/actions/setup-node/blob/main/.github/workflows/versions.yml) and [e2e-cache.yml](https://github.com/actions/setup-node/blob/main/.github/workflows/e2e-cache.yml) files.

- The contributor can add various types of tests (like unit tests or end-to-end tests), which, in his opinion, will be necessary and sufficient for testing new or changed functionality
- Tests should cover a successful execution, as well as some edge cases and possible errors
- As already mentioned, pull requests without tests will be considered more carefully by maintainers. If you are sure that in this situation the tests are not needed or cannot be implemented with a commensurate effort - please add this clarification message to your pull request

**Once you've filed the pull request:**

- CI will start automatically with some checks. Wait until the end of the execution and make sure that all checks passed successfully. If some checks fail, you can open them one by one, try to find the reason for failing and make changes to your code to resolve the problem
- Maintainers will review your pull request
- If a maintainer requests changes, first of all, try to think about his request critically and only after that implement and request another review
- If your PR gets accepted, it will soon be merged into the main branch. But your contribution will take effect only after the release of a new version of the action and updating the major tag
> Sometimes maintainers reject pull requests and that's ok! Usually, along with rejection, we supply the reason for it. Nonetheless, we still really appreciate you taking the time to do it, and we don't take that lightly :heart:

## Provide support on issues

Helping out other users with their questions is an awesome way of contributing to any community. It's not uncommon for most of the issues on open source projects to be support-related questions by users trying to understand something they ran into or find their way around a known bug.

**To help other folks out with their questions:**

- Go to the [issue tracker](https://github.com/actions/setup-node/issues)
- Read through the list until you find something that you're familiar enough with to answer to
- Respond to the issue with whatever details are needed to clarify the question, or get more details about what's going on
- Once the discussion wraps up and things are clarified, ask the original issue filer (or a maintainer) to close it for you
 
*Some notes on picking up support issues:*

- Avoid responding to issues you don't know you can answer accurately
- Try to refer to past issues with accepted answers as much as possible. Link to them from your replies
- Be kind and patient with users. Often, folks who have run into confusing things might be upset or impatient. This is natural. If you feel uncomfortable in conversation with them, it's better to stay away or withdraw from the issue.

 > If some user is violating our code of conduct [standards](https://github.com/actions/setup-node/blob/main/CODE_OF_CONDUCT.md#our-standards), refer to the [Enforcement](https://github.com/actions/setup-node/blob/main/CODE_OF_CONDUCT.md#enforcement) section of the Code of Conduct to resolve the conflict
 

## Review pull requests
 

Another great way to contribute is to review pull request. Please, be extra kind: people who submit code/doc contributions are putting themselves in a pretty vulnerable position, and have put time and care into what they've done (even if that's not obvious to you!) Please, always respond with respect, and be understanding, but don't feel like you need to sacrifice your standards for their sake, either.
 
**How to review:**

- Go to the [pull requests](https://github.com/actions/setup-node/pulls)
- Make sure you're familiar with the code or documentation is updated, unless it's a minor change (spellchecking, minor formatting, etc.)
- Review changes using the GitHub functionality. You can ask a clarifying question, point out an error or suggest an alternative. 
> Note: You may ask for minor changes - "nitpicks", but consider whether they are real blockers to merging or not
- Submit your review, which may include comments, an approval, or a changes request