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

    // Get and validate issue assignee paramters
    const team = core.getInput('team');
    const user = core.getInput('user');
    if ((team && user) || (!team && !user)) {
        throw new Error(
            'One and only one of "team" or "user" parameters must be specified'
        );
    }
    // Get assignees
    const assigneeType = user ? 'user' : 'team';
    let assignees;
    if (assigneeType === 'user') {
        assignees = [user];
    } else {
        assignees = await getTeamMemberNames(octokit, repository, team);
    }

    // Assign issue
    console.log(
        `Assigning issue ${issue.number} to ${assigneeType} ${
            assigneeType === 'user' ? user : team
        }`
    );
    try {
        await octokit.issues.addAssignees({
            owner: repoFullNameParts[0],
            repo: repoFullNameParts[1],
            issue_number: issue.number,
            assignees
        });
    } catch (error) {
        core.setFailed(error.message);
    }
};

const getTeamMemberNames = async (octokit, repository, teamName) => {
    try {
        const members = await octokit.teams.listMembersInOrg({
            org: repository.owner.name,
            team_slug: teamName
        });
        console.log(JSON.stringify(members, null, 2));
        return members.map(member => member.login);
    } catch (error) {
        throw error;
    }
};

try {
    run();
} catch (error) {
    core.setFailed(error.message);
}
