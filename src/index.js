const core = require('@actions/core');
const github = require('@actions/github');
const { runAction } = require('./action');

try {
    // Get params
    const gitHubToken = core.getInput('repo-token', { required: true });
    const assigneesString = core.getInput('assignees', { required: false });
    const teamsString = core.getInput('teams', { required: false });
    const numOfAssigneeString = core.getInput('numOfAssignee', {
        require: false
    });
    const removePreviousAssignees = core.getBooleanInput(
        'removePreviousAssignees',
        { required: false }
    );
    const allowNoAssignees = core.getBooleanInput('allowNoAssignees', {
        required: false
    });
    const allowSelfAssign = core.getBooleanInput('allowSelfAssign', {
        required: false
    });

    // Get octokit
    const octokit = github.getOctokit(gitHubToken);

    // Get context
    const contextPayload = github.context.payload;

    // Run action
    runAction(octokit, contextPayload, {
        assigneesString,
        teamsString,
        numOfAssigneeString,
        removePreviousAssignees,
        allowNoAssignees,
        allowSelfAssign
    });
} catch (error) {
    core.setFailed(error.message);
}
