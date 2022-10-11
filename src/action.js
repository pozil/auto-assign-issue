const pickNRandomFromArray = (arr, n) => {
    if (arr.length === 0) {
        throw new Error('Can not pick random from empty list.');
    }
    const available = [...arr];
    const result = [];
    for (let i = 0; i < n && available.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * available.length);
        result.push(available.splice(randomIndex, 1)[0]);
    }
    return result;
};

const getTeamMembers = async (octokit, org, teamNames) => {
    const teamMemberRequests = await Promise.all(
        teamNames.map((teamName) =>
            octokit.rest.teams.listMembersInOrg({
                org,
                team_slug: teamName
            })
        )
    ).catch((err) => {
        const newErr = new Error('Failed to retrieve team members');
        newErr.stack += `\nCaused by: ${err.stack}`;
        throw newErr;
    });
    return teamMemberRequests
        .map((response) => response.data)
        .reduce((all, cur) => all.concat(cur), [])
        .map((user) => user.login);
};

const getAssignees = async (octokit, owner, repo, issue_number) => {
    const issue = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number
    });
    const assignees = issue.data.assignees.map((assignee) => assignee.login);
    return assignees;
};

const removeAssignees = async (
    octokit,
    owner,
    repo,
    issue_number,
    assignees
) => {
    try {
        console.log(
            `Remove issue ${issue_number} assignees ${JSON.stringify(
                assignees
            )}`
        );
        await octokit.rest.issues.removeAssignees({
            owner,
            repo,
            issue_number,
            assignees
        });
    } catch (err) {
        const newErr = new Error('Failed to remove previous assignees');
        newErr.stack += `\nCaused by: ${err.stack}`;
        throw newErr;
    }
};

const isAnIssue = async (octokit, owner, repo, issue_number) => {
    let isAnIssue = false;

    try {
        const issue = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number
        });
        // In private repos, an exception is raised. In public ones, extra info comes.
        if (!issue?.data?.pull_request) {
            // if the pull_request node comes, it means is non a real issue, it is a PR
            isAnIssue = true;
        }
    } catch (err) {
        // It's the only way to identify if it's an issue, trying to retrieve its data
    }
    return isAnIssue;
};

const removeAllReviewers = async (octokit, owner, repo, pull_number) => {
    try {
        const issue = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number
        });
        const requested_reviewers = issue.data.requested_reviewers.map(
            (requested_reviewers) => requested_reviewers.login
        );
        console.log(
            `Remove PR ${issue} reviewers ${JSON.stringify(
                requested_reviewers
            )}`
        );
        await octokit.rest.pulls.removeRequestedReviewers({
            owner,
            repo,
            pull_number,
            reviewers: requested_reviewers
        });
    } catch (err) {
        const newErr = new Error('Failed to remove previous reviewers');
        newErr.stack += `\nCaused by: ${err.stack}`;
        throw newErr;
    }
};

/**
 * Runs the auto-assign issue action
 * @param {Object} octokit
 * @param {Object} context
 * @param {Object} parameters
 * @param {string} parameters.assigneesString
 * @param {string} parameters.teamsString
 * @param {string} parameters.numOfAssigneeString
 * @param {boolean} parameters.abortIfPreviousAssignees
 * @param {boolean} parameters.removePreviousAssignees
 * @param {boolean} parameters.allowNoAssignees
 * @param {boolean} parameters.allowSelfAssign
 */
const runAction = async (octokit, context, parameters) => {
    const {
        assigneesString,
        teamsString,
        numOfAssigneeString,
        abortIfPreviousAssignees = false,
        removePreviousAssignees = false,
        allowNoAssignees = false,
        allowSelfAssign = true
    } = parameters;

    // Get issue info from context
    let issueNumber =
        context.issue?.number ||
        context.pull_request?.number ||
        context.workflow_run?.pull_requests[0].number;
    let isIssue = context.issue ? true : false;
    const author =
        context.issue?.user.login ||
        context.pull_request?.user.login ||
        context.workflow_run?.actor.login;

    // If the issue is not found directly, maybe it came for a card movement with a linked issue
    if (
        !issueNumber &&
        context?.project_card?.content_url?.includes('issues')
    ) {
        const contentUrlParts = context.project_card.content_url.split('/');
        issueNumber = parseInt(contentUrlParts[contentUrlParts.length - 1], 10);
    }
    if (!issueNumber) {
        throw new Error(`Couldn't find issue info in current context`);
    }

    // Get org owner and repo name from context
    const [owner, repo] = context.repository.full_name.split('/');

    // If this flag is false is because the context object didn't bring the issue one
    // But can be an issue coming from a card, that's why we need to check it asking the API
    if (!isIssue) {
        isIssue = await isAnIssue(octokit, owner, repo, issueNumber);
    }

    // Get assignees
    const curAssignees = isIssue
        ? await getAssignees(octokit, owner, repo, issueNumber)
        : null;

    // Abort if abortIfPreviousAssignees is set and there are assignees
    if (isIssue && abortIfPreviousAssignees && curAssignees.length > 0) {
        console.log(
            'Aborting action to satisfy "abortIfPreviousAssignees" flag.'
        );
        return;
    }

    // Check assignees and teams parameters
    if (
        (!assigneesString || !assigneesString.trim()) &&
        (!teamsString || !teamsString.trim())
    ) {
        throw new Error(
            'Missing required parameters: you must provide assignees or teams'
        );
    }
    let numOfAssignee = 0;
    if (numOfAssigneeString) {
        numOfAssignee = parseInt(numOfAssigneeString, 10);
        if (isNaN(numOfAssignee)) {
            throw new Error(
                `Invalid value ${numOfAssigneeString} for numOfAssignee`
            );
        }
    }

    // Remove previous assignees if needed
    if (removePreviousAssignees) {
        await removeAssignees(octokit, owner, repo, issueNumber, curAssignees);
        // If it's a PR, then remove reviewers too
        if (!isIssue) {
            await removeAllReviewers(octokit, owner, repo, issueNumber);
        }
    }

    // Get issue assignees
    let newAssignees = [];

    // Get users
    if (assigneesString) {
        newAssignees = assigneesString
            .split(',')
            .map((assigneeName) => assigneeName.trim());
    }
    // Get team members
    if (teamsString) {
        const teamNames = teamsString
            .split(',')
            .map((teamName) => teamName.trim());
        if (teamNames) {
            const teamMembers = await getTeamMembers(octokit, owner, teamNames);
            newAssignees = newAssignees.concat(teamMembers);
        }
    }

    // Remove duplicates from assignees
    newAssignees = [...new Set(newAssignees)];

    // Remove author if allowSelfAssign is disabled
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
            `Assigning ${
                isIssue ? 'issue' : 'PR'
            } ${issueNumber} to users ${JSON.stringify(newAssignees)}`
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
        const foundIndex = newAssignees.indexOf(author);
        if (foundIndex !== -1) {
            newAssignees.splice(foundIndex, 1);
        }

        if (newAssignees.length > 0) {
            console.log(
                `Assigning PR ${issueNumber} to reviewers ${JSON.stringify(
                    newAssignees
                )}`
            );

            await octokit.rest.pulls.requestReviewers({
                owner,
                repo,
                pull_number: issueNumber,
                reviewers: newAssignees
            });
        }
    }
};

module.exports = {
    getTeamMembers,
    pickNRandomFromArray,
    runAction
};
