const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
    // Get octokit
    const gitHubToken = core.getInput('repo-token', { required: true });
    const octokit = new github.GitHub(gitHubToken);

    // Get issue assignee
    const team = core.getInput('team');
    const user = core.getInput('user');
    if ((team && user) || (!team && !user)) {
        throw new Error(
            'One and only one of "team" or "user" parameters must be specified'
        );
    }
    const assigneeType = user ? 'user' : 'team';
    const assignee = user ? user : team;

    // Show context
    console.log(JSON.stringify(github.context, undefined, 2));

    // Get repo and issue info
    const { repository, issue } = github.context.payload;
    if (!issue) {
        throw new Error(`Couldn't find issue info in current context`);
    }

    // Assign issue
    console.log(`Assigning issue ${issue.number} to ${assigneeType} ${assignee}`);
    await octokit.issues.addAssignees({
        owner: repository.owner,
        repo: repository.name,
        issue_number: issue.number,
        assignees: [assignee]
    });
};

try {
    run();
} catch (error) {
    core.setFailed(error.message);
}
