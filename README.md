# bookish-spork
I
Step 1. Create a Repository
A repository is usually used to organize a single project. Repositories can contain folders and files, images, videos, spreadsheets, and data sets – anything your project needs. We recommend including a README, or a file with information about your project. GitHub makes it easy to add one at the same time you create your new repository. It also offers other common options such as a license file.

Your hello-world repository can be a place where you store ideas, resources, or even share and discuss things with others.

To create a new repository
In the upper right corner, next to your avatar or identicon, click  and then select New repository.
Name your repository hello-world.
Write a short description.
Select Initialize this repository with a README.
new-repo-form

Click Create repository.


Step 2. Create a Branch
Branching is the way to work on different versions of a repository at one time.

By default your repository has one branch named main which is considered to be the definitive branch. We use branches to experiment and make edits before committing them to main.

When you create a branch off the main branch, you’re making a copy, or snapshot, of main as it was at that point in time. If someone else made changes to the main branch while you were working on your branch, you could pull in those updates.

This diagram shows:

The main branch
A new branch called feature (because we’re doing ‘feature work’ on this branch)
The journey that feature takes before it’s merged into main
a branch

Have you ever saved different versions of a file? Something like:

story.txt
story-joe-edit.txt
story-joe-edit-reviewed.txt
Branches accomplish similar goals in GitHub repositories.

Here at GitHub, our developers, writers, and designers use branches for keeping bug fixes and feature work separate from our main (production) branch. When a change is ready, they merge their branch into main.

To create a new branch
Go to your new repository hello-world.
Click the drop down at the top of the file list that says branch: main.
Type a branch name, readme-edits, into the new branch text box.
Select the blue Create branch box or hit “Enter” on your keyboard.
branch gif

Now you have two branches, main and readme-edits. They look exactly the same, but not for long! Next we’ll add our changes to the new branch.


Step 3. Make and commit changes
Bravo! Now, you’re on the code view for your readme-edits branch, which is a copy of main. Let’s make some edits.

On GitHub, saved changes are called commits. Each commit has an associated commit message, which is a description explaining why a particular change was made. Commit messages capture the history of your changes, so other contributors can understand what you’ve done and why.

Make and commit changes
Click the README.md file.
Click the  pencil icon in the upper right corner of the file view to edit.
In the editor, write a bit about yourself.
Write a commit message that describes your changes.
Click Commit changes button.
commit

These changes will be made to just the README file on your readme-edits branch, so now this branch contains content that’s different from main.


Step 4. Open a Pull Request
Nice edits! Now that you have changes in a branch off of main, you can open a pull request.

Pull Requests are the heart of collaboration on GitHub. When you open a pull request, you’re proposing your changes and requesting that someone review and pull in your contribution and merge them into their branch. Pull requests show diffs, or differences, of the content from both branches. The changes, additions, and subtractions are shown in green and red.

As soon as you make a commit, you can open a pull request and start a discussion, even before the code is finished.

By using GitHub’s @mention system in your pull request message, you can ask for feedback from specific people or teams, whether they’re down the hall or 10 time zones away.

You can even open pull requests in your own repository and merge them yourself. It’s a great way to learn the GitHub flow before working on larger projects.

Open a Pull Request for changes to the README
Click on the image for a larger version

Step	Screenshot
Click the  Pull Request tab, then from the Pull Request page, click the green New pull request button.	pr-tab
In the Example Comparisons box, select the branch you made, readme-edits, to compare with main (the original).	branch
Look over your changes in the diffs on the Compare page, make sure they’re what you want to submit.	diff
When you’re satisfied that these are the changes you want to submit, click the big green Create Pull Request button.	create-pull
Give your pull request a title and write a brief description of your changes.	pr-form
When you’re done with your message, click Create pull request!

Tip: You can use emoji and drag and drop images and gifs onto comments and Pull Requests.


Step 5. Merge your Pull Request
In this final step, it’s time to bring your changes together – merging your readme-edits branch into the main branch.

Click the green Merge pull request button to merge the changes into main.
Click Confirm merge.
Go ahead and delete the branch, since its changes have been incorporated, with the Delete branch button in the purple box.
merge delete

Celebrate!
By completing this tutorial, you’ve learned to create a project and make a pull request on GitHub!

Here’s what you accomplished in this tutorial:

Created an open source repository
Started and managed a new branch
Changed a file and committed those changes to GitHub
Opened and merged a Pull Request
Take a look at your GitHub profile and you’ll see your new contribution squares!

To learn more about the power of Pull Requests, we recommend reading the GitHub flow Guide. You might also visit GitHub Explore and get involved in an Open Source project.

Tip: Check out our other Guides, YouTube Channel and On-Demand Training for more on how to get started with GitHub.

Last updated July 24, 2020
