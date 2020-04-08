const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
    // Get octokit
    const gitHubToken = core.getInput('repo-token', { required: true });
    const octokit = new github.GitHub(gitHubToken);

    // Get issue assignee
    const team = core.getInput('team');
    const user = core.getInput('user');
    if ((team && user) || !(team && user)) {
        throw new Error(
            'One and only one of "team" or "user" parameters must be specified'
        );
    }
    const assignee = user ? user : team;

    // Get issue info
    const { issue } = github.context.payload;
    if (!issue) {
        throw new Error(`Couldn't find issue info in current context`);
    }
    const { issueNodeId } = issue;

    // Assign issue
    console.log(`Assigning issue ${issueNodeId} to team ${team}`);
    await octokit.issues.addAssignees({
        ...context.repo,
        issue_number: issueNodeId,
        assignees: [assignee]
    });
};

try {
    run();
} catch (error) {
    core.setFailed(error.message);
}
