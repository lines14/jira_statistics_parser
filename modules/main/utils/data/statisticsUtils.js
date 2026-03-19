/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import dotenv from 'dotenv';
import JSONLoader from './JSONLoader.js';
import TimeUtils from '../time/timeUtils.js';
import Randomizer from '../random/randomizer.js';

dotenv.config({ override: true });

class StatisticsUtils { // filter missclick transitions in Jira
  static markAssignedEntitiesLessThanHalfMinute(assignedEntityChanges) {
    assignedEntityChanges.forEach((assignedEntityChange, index, arr) => {
      if (index === 0) {
        assignedEntityChange.assignedLessThanHalfMinute = false;
      } else {
        const prev = arr[index - 1];
        const diff = assignedEntityChange.created - prev.created;
        if (diff >= JSONLoader.config.halfMinute) {
          assignedEntityChange.assignedLessThanHalfMinute = false;
        } else {
          assignedEntityChange.assignedLessThanHalfMinute = true;
        }
      }
    });
  }

  // get assignee with status overlapping indicator
  static getAssigneeWithStatus(
    [startFirstInterval, endFirstInterval],
    [startSecondInterval, endSecondInterval],
  ) {
    const overlapStart = new Date(Math.max(
      startFirstInterval.created,
      startSecondInterval.created,
    ));
    const overlapEnd = new Date(Math.min(
      endFirstInterval.created,
      endSecondInterval.created,
    ));
    const overlapDuration = overlapEnd - overlapStart;
    const overlap = startFirstInterval.created <= endSecondInterval.created
    && startSecondInterval.created <= endFirstInterval.created;

    return {
      transitionFromStatus: endFirstInterval.transitionFrom,
      transitionFromAssignee: endSecondInterval.transitionFrom,
      transitionToStatus: endFirstInterval.transitionTo,
      transitionToAssignee: endSecondInterval.transitionTo,
      overlap,
      overlapDuration,
      createdTransitionFromStatus: endFirstInterval.created,
      createdTransitionFromAssignee: endSecondInterval.created,
      transitionStatusID: endFirstInterval.ID,
      transitionAssigneeID: endSecondInterval.ID,
      assignedLessThanHalfMinuteStatus: endFirstInterval.assignedLessThanHalfMinute,
      assignedLessThanHalfMinuteAssignee: endSecondInterval.assignedLessThanHalfMinute,
    };
  }

  // recursively get comments with bugs
  static filterCommentsWithBugs(data, commentCreated, commentAuthor) {
    const results = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        results.push(...this.filterCommentsWithBugs(item, commentCreated, commentAuthor));
      }
    } else if (data !== null && typeof data === 'object') {
      if (data.created) commentCreated = data.created;
      if (data.author) commentAuthor = data.author.displayName;
      if (data.type === 'status'
        && JSONLoader.config.commentStatuses.includes(data.attrs.text.toUpperCase())) {
        if (commentCreated) data.commentCreated = commentCreated;
        if (commentAuthor) data.commentAuthor = commentAuthor;
        results.push(data);
      }

      for (const key in data) {
        if (Object.hasOwn(data, key)) {
          results.push(...this.filterCommentsWithBugs(
            data[key],
            commentCreated,
            commentAuthor,
          ));
        }
      }
    }

    return results;
  }

  // get issue field changes from changelog
  static getFieldChanges(fieldName, changelog) {
    const fieldChanges = [];
    for (const element of changelog) {
      element.items.forEach((item) => {
        if (item.field === fieldName && item.fromString) {
          fieldChanges.push({
            transitionFrom: item.fromString,
            transitionTo: item.toString,
            created: element.created,
            ID: Randomizer.getRandomString(false, false, true, false, false, 20, 20),
          });
        }
      });
    }

    // filter if field assigned more than half minute
    TimeUtils.convertTimestampsToDateObjects(fieldChanges);
    this.markAssignedEntitiesLessThanHalfMinute(fieldChanges);
    return fieldChanges;
  }

  // get backlog statuses ends to filter initial JQL query results by last transition date
  static getBacklogStatusEnds(changelog) {
    return TimeUtils.sortByTimestamps(this.getFieldChanges('status', changelog)
      .filter((statusChange) => JSONLoader.config.backlogStatus === statusChange.transitionFrom
        .toUpperCase()));
  }

  static filterLastTransitionDateFromBacklogIncluded(dateBegin, issuesArr) {
    const dateBeginTimestamp = TimeUtils.reformatDateFromYMDToISO(dateBegin);
    return issuesArr.filter((issue) => {
      const backlogStatuses = this.getBacklogStatusEnds(issue.changelog.histories);
      return TimeUtils.convertTimestampToDateObject(dateBeginTimestamp) <= backlogStatuses.pop()
        .created;
    });
  }

  // get issue statuses ends to calculate time intervals
  static getDevStatusEnds(changelog) {
    return this.getFieldChanges('status', changelog)
      .filter((statusChange) => JSONLoader.config.devIssueStatuses
        .includes(statusChange.transitionFrom.toUpperCase()));
  }

  static getTestStatusEnds(changelog) {
    return this.getFieldChanges('status', changelog)
      .filter((statusChange) => JSONLoader.config.testIssueStatuses
        .includes(statusChange.transitionFrom.toUpperCase()));
  }

  // get issue assignees changes to calculate time intervals
  static getDeveloperChanges(changelog, developerNamesByAccountIDs) {
    return this.getFieldChanges('assignee', changelog)
      .filter((assigneeChange) => developerNamesByAccountIDs
        .includes(assigneeChange.transitionFrom));
  }

  static getReporterChanges(changelog, reporterNamesByAccountIDs) {
    return this.getFieldChanges('assignee', changelog)
      .filter((assigneeChange) => reporterNamesByAccountIDs
        .includes(assigneeChange.transitionTo));
  }

  // get overlapping assignees with statuses
  static getAssigneesWithStatuses(
    statusChanges,
    assigneeChanges,
    initialTimestamp,
  ) {
    statusChanges.unshift(initialTimestamp);
    assigneeChanges.unshift(initialTimestamp);

    // get time intervals between statuses changes
    const statusChangeTimeIntervals = TimeUtils.getTimeIntervals(statusChanges);

    // get time intervals between assignees changes
    const assigneeChangeTimeIntervals = TimeUtils.getTimeIntervals(assigneeChanges);

    // get assignees with statuses at the same and longest amount of time
    return statusChangeTimeIntervals
      .map((statusChangeTimeInterval) => assigneeChangeTimeIntervals
        .map((assigneeChangeTimeInterval) => this
          .getAssigneeWithStatus(statusChangeTimeInterval, assigneeChangeTimeInterval)))
      .map((assigneeWithStatus) => [assigneeWithStatus
        .reduce((overlappedAssignee, currentElement) => {
          if (!overlappedAssignee
            || (currentElement.overlapDuration
              ?? 0) > (overlappedAssignee.overlapDuration ?? 0)) {
            return currentElement;
          }

          return overlappedAssignee;
        }, null)]
        .filter((nestedAssigneeWithStatus) => nestedAssigneeWithStatus?.overlap)
        .filter((nestedAssigneeWithStatus) => !nestedAssigneeWithStatus
          .assignedLessThanHalfMinuteStatus
        && !nestedAssigneeWithStatus.assignedLessThanHalfMinuteAssignee));
  }

  // search previous developer assignee before bug found
  static linkDevelopersWithBugs(commentsWithBugs, testedIssue, developerNamesByAccountIDs) {
    if (commentsWithBugs.length) {
      return commentsWithBugs.map((commentWithBug) => {
        const linkedAssigneeWithBug = { ...commentWithBug };
        const sortedChangelog = TimeUtils.sortByTimestamps(testedIssue.changelog);
        const initialTimestamp = TimeUtils.createInitialTimestamp(sortedChangelog);

        // get dev status ends from issue history
        const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

        // get developer assignee changes from issue history
        const developerChanges = this.getDeveloperChanges(
          sortedChangelog,
          developerNamesByAccountIDs,
        );

        // filter not includes issues with only one assignee or status due to lack of transition
        // and get developer assignees with dev statuses at the same time
        if (developerChanges.length && devStatusEnds.length) {
          const overlappedAssignees = this.getAssigneesWithStatuses(
            devStatusEnds,
            developerChanges,
            initialTimestamp,
          ).flat();

          const uniqueOverlappedAssignees = this
            .getUniqueOverlappedAssignees(overlappedAssignees);

          const overlappedAssigneesInProgress = this
            .getOverlappedAssigneesInProgress(overlappedAssignees);

          const uniqueOverlappedAssigneesInProgress = this
            .getUniqueOverlappedAssignees(overlappedAssigneesInProgress);

          const overlappedAssigneesInReopenOrInProgress = this
            .getOverlappedAssigneesInReopenOrInProgress(overlappedAssignees);

          const uniqueOverlappedAssigneesInReopenOrInProgress = this
            .getUniqueOverlappedAssignees(overlappedAssigneesInReopenOrInProgress);

          // search and use only developers in IN PROGRESS and in REOPEN statuses
          // if IN PROGRESS exist else in BACKLOG and TO DO statuses too
          let devAssignees;
          if (!uniqueOverlappedAssigneesInProgress.length) {
            devAssignees = uniqueOverlappedAssignees;
          } else {
            devAssignees = uniqueOverlappedAssigneesInReopenOrInProgress;
          }

          linkedAssigneeWithBug.devAssignees = devAssignees;
        }

        return linkedAssigneeWithBug;
      });
    }

    return [];
  }

  static getIssueDevelopers(testedIssue, developerNamesByAccountIDs) {
    if (testedIssue.changelog.length) {
      const sortedChangelog = TimeUtils.sortByTimestamps(testedIssue.changelog);
      const initialTimestamp = TimeUtils.createInitialTimestamp(sortedChangelog);

      // get dev status ends from issue history
      const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

      // get developer assignee changes from issue history
      const developerChanges = this.getDeveloperChanges(
        sortedChangelog,
        developerNamesByAccountIDs,
      );

      // get developer assignees with dev statuses at the same time
      const overlappedAssignees = this.getAssigneesWithStatuses(
        devStatusEnds,
        developerChanges,
        initialTimestamp,
      ).flat();

      const overlappedAssigneesInProgress = this
        .getOverlappedAssigneesInProgress(overlappedAssignees);

      const uniqueOverlappedAssigneesInProgress = this
        .getUniqueOverlappedAssignees(overlappedAssigneesInProgress);

      const overlappedAssigneesInReopen = this
        .getOverlappedAssigneesInReopen(overlappedAssignees);

      const uniqueOverlappedAssigneesInReopen = this
        .getUniqueOverlappedAssignees(overlappedAssigneesInReopen);

      const overlappedAssigneesInReopenOrInProgress = this
        .getOverlappedAssigneesInReopenOrInProgress(overlappedAssignees);

      // search and use only developers in IN PROGRESS or in REOPEN statuses if exist
      // else in BACKLOG or TO DO statuses
      if (!overlappedAssigneesInReopenOrInProgress.length
        || (!uniqueOverlappedAssigneesInProgress.length
          && uniqueOverlappedAssigneesInReopen.length === 1)) {
        return overlappedAssignees;
      }
      return overlappedAssigneesInReopenOrInProgress;
    }
    return [];
  }

  static getIssueReporters(testedIssue, reporterNamesByAccountIDs) {
    if (testedIssue.changelog.length) {
      const sortedChangelog = TimeUtils.sortByTimestamps(testedIssue.changelog);
      const initialTimestamp = TimeUtils.createInitialTimestamp(sortedChangelog);

      // get test status starts from issue history
      const testStatusEnds = this.getTestStatusEnds(sortedChangelog);

      // get reporter assignee changes from issue history
      const reporterChanges = this.getReporterChanges(sortedChangelog, reporterNamesByAccountIDs);

      // get reporter assignees with test statuses at the same time
      return this.getAssigneesWithStatuses(
        testStatusEnds,
        reporterChanges,
        initialTimestamp,
      ).flat();
    }
    return [];
  }

  static getOverlappedAssigneesInProgress(overlappedAssignees) {
    return overlappedAssignees
      .filter((overlappedAssignee) => overlappedAssignee.transitionFromStatus
        .toUpperCase() === JSONLoader.config.inProgressStatus);
  }

  static getOverlappedAssigneesInReopen(overlappedAssignees) {
    return overlappedAssignees
      .filter((overlappedAssignee) => overlappedAssignee.transitionFromStatus
        .toUpperCase() === JSONLoader.config.reopenStatus);
  }

  static getOverlappedAssigneesInReopenOrInProgress(overlappedAssignees) {
    return overlappedAssignees
      .filter((overlappedAssignee) => overlappedAssignee.transitionFromStatus
        .toUpperCase() === JSONLoader.config.inProgressStatus
        || overlappedAssignee.transitionFromStatus
          .toUpperCase() === JSONLoader.config.reopenStatus);
  }

  static getUniqueOverlappedAssignees(overlappedAssignees) {
    return [...overlappedAssignees]
      .reverse()
      .filter((overlappedAssignee, index, arr) => arr
        .findIndex((el) => el.transitionFromAssignee === overlappedAssignee
          .transitionFromAssignee) === index)
      .reverse();
  }

  // get unique developers from each issue
  static getDevelopersWorkload(issuesArr, developerNamesByAccountIDs) {
    return issuesArr // skip issues that synthetically participated in debug of parser
      .filter((issue) => !JSONLoader.config.debugIssues
        .includes(issue.key))
      .map((issue) => {
        const assignees = [
          ...new Set(this.getIssueDevelopers(issue, developerNamesByAccountIDs)
            .map((assignee) => assignee.transitionFromAssignee)),
        ];

        return {
          projectName: issue.projectName,
          assignees: assignees.length
            ? assignees
            : [JSONLoader.config.issueWithoutAssignee],
          changelog: issue.changelog,
        };
      });
  }

  // get unique reporters from each issue
  static getReportersWorkload(issuesArr, reporterNamesByAccountIDs) {
    return issuesArr // skip issues that synthetically participated in debug of parser
      .filter((issue) => !JSONLoader.config.debugIssues
        .includes(issue.key))
      .map((issue) => {
        const assignees = [...new Set(this.getIssueReporters(issue, reporterNamesByAccountIDs)
          .map((assignee) => assignee.transitionToAssignee))];

        return {
          projectName: issue.projectName,
          assignees: assignees.length
            ? assignees
            : [JSONLoader.config.issueWithoutAssignee],
        };
      });
  }

  static getProjectsUnassignedIssuesCount(projectAssignees) {
    const result = {};
    for (const [projectName, project] of Object.entries(projectAssignees)) {
      result[projectName] = project.assignees.unassigned?.issuesCount || 0;
    }

    return result;
  }

  static setUnassignedIssuesCountToProjects(
    projects,
    projectUnassignedIssuesCount,
    options = { developer: false },
  ) {
    const countFieldName = options.developer
      ? 'developersUnassignedAllIssuesCount'
      : 'reportersUnassignedAllIssuesCount';

    const ratioFieldName = options.developer
      ? 'developersUnassignedAllIssuesCountPerIssuesCount'
      : 'reportersUnassignedAllIssuesCountPerIssuesCount';

    for (const [projectName, project] of Object.entries(projects)) {
      for (const [name, count] of Object.entries(projectUnassignedIssuesCount)) {
        if (projectName === name && count) {
          project[countFieldName] = count;
          project[ratioFieldName] = Number((count
            / project.issuesCount).toFixed(JSONLoader.config.decimalPlaces));
        }
      }
    }
  }

  static getReopenedIssuesWithReopensCount(issuesArr) {
    return issuesArr.map((issue) => {
      const issueWithCounter = structuredClone(issue);
      issueWithCounter.reopensCount = issueWithCounter.changelog
        .reduce((count, changelogItem) => count + changelogItem.items
          .filter((item) => item.toString?.toUpperCase() === JSONLoader.config.reopenStatus)
          .length, 0);

      return issueWithCounter;
    }).filter((issue) => issue.reopensCount > 0);
  }

  static getOverallReopensCount(reopenedIssuesWithCommentsArr) {
    let overallReopensCount = 0;
    reopenedIssuesWithCommentsArr.forEach((reopenedIssueWithComments) => {
      overallReopensCount += reopenedIssueWithComments.reopensCount;
    });

    return overallReopensCount;
  }

  static getOverallBugsCount(filteredTestedIssuesWithBugsArr) {
    let overallBugsCount = 0;
    filteredTestedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
      overallBugsCount += testedIssueWithBugs.bugsCount;
    });

    return overallBugsCount;
  }

  static getAllUnassignedIssuesCount(assignees) {
    const unassignedAllIssuesCount = assignees.unassigned.allIssuesCount;
    delete assignees.unassigned;

    return unassignedAllIssuesCount;
  }

  // convert assignees summary from assignees to projects scope
  static convertAssigneesToProjectsStructure(obj) {
    const result = {};
    for (const [assignee, data] of Object.entries(obj)) {
      const projects = data.projects || {};
      for (const [project, projectData] of Object.entries(projects)) {
        if (!result[project]) {
          result[project] = { assignees: {} };
        }

        result[project].assignees[assignee] = { ...projectData };
      }
    }

    return result;
  }

  static getTestedIssues(filteredIssuesWithCommentsArr) {
    return filteredIssuesWithCommentsArr
      .map((filteredIssueWithComments) => structuredClone(filteredIssueWithComments))
      .filter((filteredIssueWithComments) => filteredIssueWithComments.changelog
        .some((changelogItem) => changelogItem.items
          .some((item) => JSONLoader.config.testIssueStatuses
            .includes(item.fromString?.toUpperCase())
            || JSONLoader.config.testIssueStatuses
              .includes(item.toString?.toUpperCase()))));
  }

  static getDeployedOrDoneIssuesWithDevelopersAndWithoutInProgressStatus(issuesWithDevelopersArr) {
    return issuesWithDevelopersArr
      .map((issueWithDevelopers) => structuredClone(issueWithDevelopers))
      .filter((issueWithDevelopers) => {
        const hasDeployedOrDone = issueWithDevelopers.changelog
          .some((changelogItem) => changelogItem.items
            .some((item) => JSONLoader.config.deployedOrDoneStatuses
              .includes(item.fromString?.toUpperCase())
              || JSONLoader.config.deployedOrDoneStatuses
                .includes(item.toString?.toUpperCase())));

        const hasInProgress = issueWithDevelopers.changelog
          .some((changelogItem) => changelogItem.items
            .some((item) => item.fromString?.toUpperCase() === JSONLoader.config.inProgressStatus
            || item.toString?.toUpperCase() === JSONLoader.config.inProgressStatus));

        const withoutDevelopers = issueWithDevelopers.assignees
          .some((assignee) => assignee === JSONLoader.config.issueWithoutAssignee);

        return hasDeployedOrDone && !hasInProgress && !withoutDevelopers;
      });
  }

  static getTestesIssuesWithBugsAndAuthors(
    testedIssuesWithCommentsArr,
    developerNamesByAccountIDs,
  ) {
    let commentAuthor;
    let commentCreated;

    return testedIssuesWithCommentsArr
      .reduce((acc, filteredTestedIssueWithComments) => {
        const { comments } = filteredTestedIssueWithComments;

        const commentsWithBugs = comments.flatMap((comment) => this
          .filterCommentsWithBugs(comment, commentCreated, commentAuthor));

        // get author of the each bug
        const commentsWithBugsLinkedToDevelopers = this.linkDevelopersWithBugs(
          commentsWithBugs,
          filteredTestedIssueWithComments,
          developerNamesByAccountIDs,
        );

        // return the issue if bugs exist
        const bugsCount = commentsWithBugsLinkedToDevelopers.length;
        if (bugsCount > 0) {
          acc.push({
            ...filteredTestedIssueWithComments,
            bugsCount,
            commentsWithBugsLinkedToDevelopers,
          });
        }

        return acc;
      }, []);
  }

  static searchUniqueEntities(filteredIssuesWithCommentsArr) {
    const projectNames = [...new Set(filteredIssuesWithCommentsArr
      .map((issueWithComments) => issueWithComments.projectName))];

    const priorityNames = [...new Set(filteredIssuesWithCommentsArr
      .map((issueWithComments) => issueWithComments.priority))];

    const devTypeNames = [...new Set(filteredIssuesWithCommentsArr
      .map((issueWithComments) => issueWithComments.devType
      ?? JSONLoader.config.issueWithoutAssignee))];

    const issueTypeNames = [...new Set(filteredIssuesWithCommentsArr
      .map((issueWithComments) => issueWithComments.issuetype))];

    return {
      projectNames,
      priorityNames,
      devTypeNames,
      issueTypeNames,
    };
  }
}

export default StatisticsUtils;
