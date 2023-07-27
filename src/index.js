const core = require('@actions/core');
const github = require('@actions/github');
const { runAction } = require('./action');
const { parseIntInput, parseCsvInput } = require('./utils');

try {
    // Get params
    const gitHubToken = core.getInput('repo-token', { required: true });
    const assignees = parseCsvInput(
        core.getInput('assignees', { required: false })
    );
    const teams = parseCsvInput(core.getInput('teams', { required: false }));
    let numOfAssignee;
    try {
        numOfAssignee = parseIntInput(
            core.getInput('numOfAssignee', {
                require: false
            }),
            0
        );
    } catch (error) {
        throw new Error(
            `Failed to parse value for numOfAssignee: ${error.message}`
        );
    }

    const abortIfPreviousAssignees = core.getBooleanInput(
        'abortIfPreviousAssignees',
        { required: false }
    );
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

    let manualIssueNumber;
    try {
        manualIssueNumber = parseIntInput(
            core.getInput('issueNumber', {
                require: false
            }),
            0
        );
    } catch (error) {
        throw new Error(
            `Failed to parse value for issueNumber: ${error.message}`
        );
    }

    // Get octokit
    const octokit = github.getOctokit(gitHubToken);

    // Get context
    const contextPayload = github.context.payload;

    // Run action
    runAction(octokit, contextPayload, {
        assignees,
        teams,
        numOfAssignee,
        abortIfPreviousAssignees,
        removePreviousAssignees,
        allowNoAssignees,
        allowSelfAssign,
        manualIssueNumber
    });
} catch (error) {
    core.setFailed(error.message);
}
