const {
    pickNRandomFromArray,
    getAssignees,
    getTeamMembers,
    removeAssignees,
    isAnIssue,
    removeAllReviewers
} = require('./utils');

/**
 * Runs the auto-assign issue action
 * @param {Object} octokit
 * @param {Object} context
 * @param {Object} parameters
 * @param {string[]} parameters.assignees
 * @param {string[]} parameters.teams
 * @param {number} parameters.numOfAssignee
 * @param {boolean} parameters.abortIfPreviousAssignees
 * @param {boolean} parameters.removePreviousAssignees
 * @param {boolean} parameters.allowNoAssignees
 * @param {boolean} parameters.allowSelfAssign
 * @param {number} parameters.manualIssueNumber
 */
const runAction = async (octokit, context, parameters) => {
    const {
        assignees = [],
        teams = [],
        numOfAssignee = 0,
        abortIfPreviousAssignees = false,
        removePreviousAssignees = false,
        allowNoAssignees = false,
        allowSelfAssign = true,
        manualIssueNumber = 0
    } = parameters;

    // Check assignees and teams parameters
    if (assignees.length === 0 && teams.length === 0) {
        throw new Error(
            'Missing required parameters: you must provide assignees or teams'
        );
    }

    let isIssue =
        typeof context.issue !== 'undefined' &&
        typeof context.pull_request === 'undefined' &&
        context.workflow_run?.pull_requests?.length === undefined;
    const author =
        context.issue?.user.login ||
        context.pull_request?.user.login ||
        context.workflow_run?.actor.login;
    const [owner, repo] = context.repository.full_name.split('/');

    let issueNumber = manualIssueNumber;
    if (manualIssueNumber === 0) {
        // Try to get number from the context.
        issueNumber =
            context.issue?.number ||
            context.pull_request?.number ||
            context.workflow_run?.pull_requests[0]?.number;
    }

    // If the issue is not found in context or by parameter, maybe it came for a card movement with a linked issue/PR.
    if (
        !issueNumber &&
        context?.project_card?.content_url?.includes('issues')
    ) {
        const contentUrlParts = context.project_card.content_url.split('/');
        issueNumber = parseInt(contentUrlParts[contentUrlParts.length - 1], 10);
        // Check with the API that issueNumber is tied to an issue (it could be a PR in this case)
        isIssue = await isAnIssue(octokit, owner, repo, issueNumber);
    }
    if (!issueNumber) {
        throw new Error(`Couldn't find issue info in current context`);
    }

    // Get assignees
    const curAssignees = await getAssignees(octokit, owner, repo, issueNumber);

    // Abort if abortIfPreviousAssignees is set and there are assignees
    if (abortIfPreviousAssignees && curAssignees.length > 0) {
        console.log(
            'Aborting action to satisfy "abortIfPreviousAssignees" flag.'
        );
        return;
    }

    // Remove previous assignees if needed
    if (removePreviousAssignees) {
        await removeAssignees(octokit, owner, repo, issueNumber, curAssignees);
        // If it's a PR, then remove reviewers too
        if (!isIssue) {
            await removeAllReviewers(octokit, owner, repo, issueNumber);
        }
    }

    // Get new issue assignees
    let newAssignees = assignees;

    // Get assignee team members
    if (teams.length > 0) {
        const teamMembers = await getTeamMembers(octokit, owner, teams);
        newAssignees = newAssignees.concat(teamMembers);
    }

    // Remove duplicates from assignees
    newAssignees = [...new Set(newAssignees)];

    // Remove author if allowSelfAssign is false
    if (!allowSelfAssign) {
        const foundIndex = newAssignees.indexOf(author);
        if (foundIndex !== -1) {
            newAssignees.splice(foundIndex, 1);
        }
    }

    // Check if there are assignees left
    if (newAssignees.length > 0) {
        // Select random assignees
        if (numOfAssignee) {
            newAssignees = pickNRandomFromArray(newAssignees, numOfAssignee);
        }

        // Assign issue
        console.log(
            `Setting assignees for ${
                isIssue ? 'issue' : 'PR'
            } ${issueNumber}: ${JSON.stringify(newAssignees)}`
        );
        await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number: issueNumber,
            assignees: newAssignees
        });
    } else if (!allowNoAssignees) {
        throw new Error('No candidates found for assignment');
    }

    // Assign PR reviewers
    if (!isIssue) {
        // Remove author from reviewers
        const newReviewers = [...newAssignees];
        const foundIndex = newReviewers.indexOf(author);
        if (foundIndex !== -1) {
            newReviewers.splice(foundIndex, 1);
        }

        if (newReviewers.length > 0) {
            console.log(
                `Setting reviewers for PR ${issueNumber}: ${JSON.stringify(
                    newReviewers
                )}`
            );
            await octokit.rest.pulls.requestReviewers({
                owner,
                repo,
                pull_number: issueNumber,
                reviewers: newReviewers
            });
        }
    }
};

module.exports = {
    runAction
};
