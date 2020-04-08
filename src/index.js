const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
    // Get octokit
    const gitHubToken = core.getInput('repo-token', { required: true });
    const octokit = new github.GitHub(gitHubToken);

    // Get repo and issue info
    const { repository, issue } = github.context.payload;
    if (!issue) {
        throw new Error(`Couldn't find issue info in current context`);
    }
    const repoFullNameParts = repository.full_name.split('/');

    // Get issue assignee
    const user = core.getInput('user', { required: true });

    // Assign issue
    console.log(
        `Assigning issue ${issue.number} to user ${user}`
    );
    try {
        await octokit.issues.addAssignees({
            owner: repoFullNameParts[0],
            repo: repoFullNameParts[1],
            issue_number: issue.number,
            assignees: [ user ]
        });
    } catch (error) {
        core.setFailed(error.message);
    }
};

try {
    run();
} catch (error) {
    core.setFailed(error.message);
}
