/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import JSONLoader from './JSONLoader.js';
import TimeUtils from '../time/timeUtils.js';
import Randomizer from '../random/randomizer.js';

class DataUtils {
  static saveToJSON(obj, options = { folder: 'artifacts' }) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./${options.folder}/${name}.json`, JSON.stringify(data, replacer, 4));
  }

  static sortByTimestamps(changelog) {
    return changelog.sort((a, b) => TimeUtils.convertTimestampToDateObject(a.created)
    - TimeUtils.convertTimestampToDateObject(b.created));
  }

  static convertTimestampsToDateObjects(changelogItems) {
    changelogItems.forEach((changelogItem) => {
      changelogItem.created = TimeUtils
        .convertTimestampToDateObject(changelogItem.created);
    });
  }

  static getTimeIntervals(changelogItems) {
    const timeIntervals = [];
    for (let i = 0; i < changelogItems.length - 1; i += 1) {
      timeIntervals.push([changelogItems[i], changelogItems[i + 1]]);
    }

    return timeIntervals;
  }

  static createInitialTimestamp(sortedChangelog) {
    return {
      transitionFrom: JSONLoader.config.initIssueStatus,
      created: TimeUtils.convertTimestampToDateObject(sortedChangelog[0].created),
    };
  }

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
    this.convertTimestampsToDateObjects(fieldChanges);
    this.markAssignedEntitiesLessThanHalfMinute(fieldChanges);
    return fieldChanges;
  }

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

  static getDeveloperChanges(changelog) {
    return this.getFieldChanges('assignee', changelog)
      .filter((assigneeChange) => JSONLoader.config.developers
        .includes(assigneeChange.transitionFrom));
  }

  static getReporterChanges(changelog) {
    return this.getFieldChanges('assignee', changelog)
      .filter((assigneeChange) => JSONLoader.config.reporters
        .includes(assigneeChange.transitionTo));
  }

  static getAssigneesWithStatuses(
    statusChanges,
    assigneeChanges,
    initialTimestamp,
  ) {
    statusChanges.unshift(initialTimestamp);
    assigneeChanges.unshift(initialTimestamp);

    // get time intervals between statuses changes
    const statusChangeTimeIntervals = this.getTimeIntervals(statusChanges);

    // get time intervals between assignees changes
    const assigneeChangeTimeIntervals = this.getTimeIntervals(assigneeChanges);

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
  static linkDevelopersWithBugs(testedIssue) {
    if (testedIssue.commentsWithBugs.length) {
      return testedIssue.commentsWithBugs.map((commentWithBug) => {
        const linkedAssigneeWithBug = { ...commentWithBug };
        const commentCreatedDateObj = TimeUtils
          .convertTimestampToDateObject(commentWithBug.commentCreated);

        const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
        const initialTimestamp = this.createInitialTimestamp(sortedChangelog);

        // get dev status ends from issue history
        const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

        // get developer assignee changes from issue history
        const assigneeChanges = this.getDeveloperChanges(sortedChangelog);

        // filter not includes issues with only one assignee or status due to lack of transition
        // and get developer assignees with dev statuses at the same time
        if (assigneeChanges.length && devStatusEnds.length) {
          const overlappedAssignees = this.getAssigneesWithStatuses(
            devStatusEnds,
            assigneeChanges,
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

          // search and use only developers in IN PROGRESS or REOPEN statuses if exist
          let validOverlappedAssignees;
          if (!overlappedAssigneesInReopenOrInProgress.length
            || (!uniqueOverlappedAssigneesInProgress.length
              && uniqueOverlappedAssigneesInReopen.length === 1)) {
            validOverlappedAssignees = overlappedAssignees;
          } else {
            validOverlappedAssignees = overlappedAssigneesInReopenOrInProgress;
          }

          // get last previous developer assignee with dev status before bug found
          // or the only one developer from issue
          let lastPreviousDevAssignee;
          if (!uniqueOverlappedAssigneesInReopen.length
            && uniqueOverlappedAssigneesInProgress.length === 1) {
            lastPreviousDevAssignee = uniqueOverlappedAssigneesInProgress.pop();
          } else {
            lastPreviousDevAssignee = validOverlappedAssignees
              .filter((overlappedAssignee) => overlappedAssignee
                .createdTransitionFromAssignee <= commentCreatedDateObj
              && overlappedAssignee
                .createdTransitionFromStatus <= commentCreatedDateObj)
              .reduce((prev, curr) => {
                if (!prev) return curr;
                return curr.createdTransitionFromStatus > prev.createdTransitionFromStatus
              && curr.createdTransitionFromAssignee > prev.createdTransitionFromAssignee
                  ? curr
                  : prev;
              }, null);
          }

          linkedAssigneeWithBug.lastPreviousDevAssignee = lastPreviousDevAssignee;
        }

        return linkedAssigneeWithBug;
      });
    }

    return [];
  }

  static getIssueDevelopers(testedIssue) {
    const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
    const initialTimestamp = this.createInitialTimestamp(sortedChangelog);

    // get dev status ends from issue history
    const statusEnds = this.getDevStatusEnds(sortedChangelog);

    // get developer assignee changes from issue history
    const assigneeChanges = this.getDeveloperChanges(sortedChangelog);

    // get developer assignees with dev statuses at the same time
    const overlappedAssignees = this.getAssigneesWithStatuses(
      statusEnds,
      assigneeChanges,
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

    // search and use only developers in IN PROGRESS or REOPEN statuses if exist
    if (!overlappedAssigneesInReopenOrInProgress.length
      || (!uniqueOverlappedAssigneesInProgress.length
        && uniqueOverlappedAssigneesInReopen.length === 1)) {
      return overlappedAssignees;
    }
    return overlappedAssigneesInReopenOrInProgress;
  }

  static getIssueReporters(testedIssue) {
    const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
    const initialTimestamp = this.createInitialTimestamp(sortedChangelog);

    // get test status starts from issue history
    const statusEnds = this.getTestStatusEnds(sortedChangelog);

    // get reporter assignee changes from issue history
    const assigneeChanges = this.getReporterChanges(sortedChangelog);

    // get reporter assignees with test statuses at the same time
    return this.getAssigneesWithStatuses(
      statusEnds,
      assigneeChanges,
      initialTimestamp,
    ).flat();
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
    return overlappedAssignees
      .filter((overlappedAssignee, index, arr) => arr
        .findIndex((el) => el.transitionFromAssignee === overlappedAssignee
          .transitionFromAssignee) === index);
  }

  static fillBugsPerEntities(
    accumulator,
    testedIssuesWithCommentsArr,
    testedIssuesWithBugsArr,
    key,
    entityNames,
    overallBugsCount,
  ) {
    entityNames.forEach((el) => {
      let bugsCount = 0;

      const testedIssuesCount = testedIssuesWithCommentsArr
        .filter((testedIssueWithComments) => testedIssueWithComments[key] === el).length;

      const testedIssuesWithBugsCount = testedIssuesWithBugsArr
        .filter((testedIssueWithBugs) => testedIssueWithBugs[key] === el).length;

      testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
        if (testedIssueWithBugs[key] === el) {
          bugsCount += testedIssueWithBugs.bugsCount;
        }
      });

      if (testedIssuesCount > 0) {
        accumulator[el] = { testedIssuesCount };
      }

      if (testedIssuesWithBugsCount > 0) {
        accumulator[el].testedIssuesWithBugsCount = testedIssuesWithBugsCount;
      }

      if (bugsCount > 0) {
        accumulator[el].bugsCount = bugsCount;
      }

      if (bugsCount > 0 && testedIssuesCount > 0) {
        const bugsCountPerTestedIssueCountRatio = Number((bugsCount
        / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
        accumulator[el].bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;
      }

      if (bugsCount > 0 && testedIssuesWithBugsCount > 0) {
        const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
        / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        accumulator[el]
          .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;
      }

      if (bugsCount > 0 && overallBugsCount > 0) {
        const bugsCountPerOverallBugsCountRatio = Number((bugsCount
          / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
        accumulator[el].bugsCountPerOverallBugsCountRatio = bugsCountPerOverallBugsCountRatio;
      }
    });
  }

  static getDevelopersWorkload(issuesArr) {
    return issuesArr
      .filter((issue) => !JSONLoader.config.debugIssues
        .includes(issue.key))
      .map((issue) => {
        const assignees = [...new Set(DataUtils.getIssueDevelopers(issue)
          .map((assignee) => assignee.transitionFromAssignee))];

        return {
          projectName: issue.projectName,
          assignees: assignees.length
            ? assignees
            : [JSONLoader.config.issueWithoutAssignee],
        };
      });
  }

  static getReportersWorkload(issuesArr) {
    return issuesArr
      .filter((issue) => !JSONLoader.config.debugIssues
        .includes(issue.key))
      .map((issue) => {
        const assignees = [...new Set(DataUtils.getIssueReporters(issue)
          .map((assignee) => assignee.transitionToAssignee))];

        return {
          projectName: issue.projectName,
          assignees: assignees.length
            ? assignees
            : [JSONLoader.config.issueWithoutAssignee],
        };
      });
  }

  static averageRatio(ratiosArr) {
    return Number((ratiosArr.reduce((sum, val) => sum + val, 0)
    / ratiosArr.length).toFixed(JSONLoader.config.decimalPlaces));
  }

  static fillBugsPerAssignees(
    accumulator,
    testedIssuesWithBugsArr,
    testedIssuesWithAssigneesArr,
    testedIssuesWithBugsAndAssigneesArr,
    projectNames,
    assigneeNames,
    overallBugsCount,
    options = { lastPreviousDevAssignee: true },
  ) {
    assigneeNames.forEach((el) => {
      let allBugsCount = 0;
      let allTestedIssuesCount = 0;
      let allTestedIssuesWithBugsCount = 0;
      let allBugsCountPerOverallBugsCountRatio = 0;
      const bugsCountPerTestedIssueCountRatios = [];
      const bugsCountPerTestedIssueWithBugsCountRatios = [];
      const projectBugCounts = {};

      projectNames.forEach((projectName) => {
        let bugsCount = 0;
        let testedIssuesCount = 0;
        let testedIssuesWithBugsCount = 0;

        testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
          testedIssueWithBugs.linkedCommentsWithBugs.forEach((linkedCommentWithBugs) => {
            if (
              testedIssueWithBugs.projectName === projectName
              && (options.lastPreviousDevAssignee
                ? (linkedCommentWithBugs.lastPreviousDevAssignee?.transitionFromAssignee
                ?? JSONLoader.config.issueWithoutAssignee)
                : linkedCommentWithBugs.commentAuthor) === el
            ) {
              bugsCount += 1;
            }
          });
        });

        testedIssuesWithAssigneesArr.forEach((testedIssueWithDevelopers) => {
          if (testedIssueWithDevelopers.projectName === projectName) {
            testedIssueWithDevelopers.assignees.forEach((assignee) => {
              if (assignee === el) {
                testedIssuesCount += 1;
              }
            });
          }
        });

        testedIssuesWithBugsAndAssigneesArr.forEach((testedIssueWithBugsAndDevelopers) => {
          if (testedIssueWithBugsAndDevelopers.projectName === projectName) {
            testedIssueWithBugsAndDevelopers.assignees.forEach((assignee) => {
              if (assignee === el) {
                testedIssuesWithBugsCount += 1;
              }
            });
          }
        });

        if (testedIssuesCount > 0 || testedIssuesWithBugsCount > 0 || bugsCount > 0) {
          projectBugCounts[projectName] = {};
        }

        if (testedIssuesCount > 0) {
          projectBugCounts[projectName].testedIssuesCount = testedIssuesCount;
          allTestedIssuesCount += testedIssuesCount;
        }

        if (testedIssuesWithBugsCount > 0) {
          projectBugCounts[projectName].testedIssuesWithBugsCount = testedIssuesWithBugsCount;
          allTestedIssuesWithBugsCount += testedIssuesWithBugsCount;
        }

        if (bugsCount > 0) {
          projectBugCounts[projectName].bugsCount = bugsCount;
          allBugsCount += bugsCount;
        }

        if (testedIssuesCount > 0 && bugsCount > 0) {
          const bugsCountPerTestedIssueCountRatio = Number((bugsCount
            / testedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .bugsCountPerTestedIssueCountRatio = bugsCountPerTestedIssueCountRatio;
          bugsCountPerTestedIssueCountRatios.push(bugsCountPerTestedIssueCountRatio);
        }

        if (testedIssuesWithBugsCount > 0 && bugsCount > 0) {
          const bugsCountPerTestedIssueWithBugsCountRatio = Number((bugsCount
            / testedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .bugsCountPerTestedIssueWithBugsCountRatio = bugsCountPerTestedIssueWithBugsCountRatio;
          bugsCountPerTestedIssueWithBugsCountRatios
            .push(bugsCountPerTestedIssueWithBugsCountRatio);
        }

        if (bugsCount > 0 && overallBugsCount > 0) {
          const bugsCountPerOverallBugsCountRatio = Number((bugsCount
            / overallBugsCount).toFixed(JSONLoader.config.decimalPlaces));
          projectBugCounts[projectName]
            .bugsCountPerOverallBugsCountRatio = bugsCountPerOverallBugsCountRatio;
          allBugsCountPerOverallBugsCountRatio += bugsCountPerOverallBugsCountRatio;
        }
      });

      accumulator[el] = {
        projects: projectBugCounts,
      };

      if (allTestedIssuesCount > 0) {
        accumulator[el].allTestedIssuesCount = allTestedIssuesCount;
      }

      if (allTestedIssuesWithBugsCount > 0) {
        accumulator[el].allTestedIssuesWithBugsCount = allTestedIssuesWithBugsCount;
      }

      if (allBugsCount > 0) {
        accumulator[el].allBugsCount = allBugsCount;
      }

      if (allBugsCountPerOverallBugsCountRatio > 0) {
        accumulator[el]
          .allBugsCountPerOverallBugsCountRatio = Number(allBugsCountPerOverallBugsCountRatio
            .toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allBugsCount > 0 && allTestedIssuesCount > 0) {
        accumulator[el].allBugsCountPerAllTestedIssueCountRatio = Number((allBugsCount
          / allTestedIssuesCount).toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allBugsCount > 0 && allTestedIssuesWithBugsCount > 0) {
        accumulator[el].allBugsCountPerAllTestedIssueWithBugsCountRatio = Number((allBugsCount
          / allTestedIssuesWithBugsCount).toFixed(JSONLoader.config.decimalPlaces));
      }

      if (allTestedIssuesCount > 0 && allBugsCount > 0) {
        accumulator[el].bugsCountPerTestedIssueCountAverageRatio = DataUtils
          .averageRatio(bugsCountPerTestedIssueCountRatios);
      }

      if (allTestedIssuesWithBugsCount > 0 && allBugsCount > 0) {
        accumulator[el].bugsCountPerTestedIssueWithBugsCountAverageRatio = DataUtils
          .averageRatio(bugsCountPerTestedIssueWithBugsCountRatios);
      }
    });
  }

  static extractPropertyByName(obj, ...propertyNames) {
    const result = {};
    if (typeof obj !== 'object' || obj === null) return result;
    const isFlat = propertyNames.some((p) => p in obj);
    if (isFlat) {
      for (const prop of propertyNames) {
        if (prop in obj) {
          result[prop] = obj[prop];
        }
      }
      return result;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        const filtered = {};
        for (const prop of propertyNames) {
          if (prop in value) filtered[prop] = value[prop];
        }
        if (Object.keys(filtered).length > 0) {
          result[key] = filtered;
        }
      }
    }

    return result;
  }

  static setCyrillicNames(obj, namesMapping) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.setCyrillicNames(item, namesMapping));
    } if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = namesMapping[key] || key;
        newObj[newKey] = this.setCyrillicNames(value, namesMapping);
      }

      return newObj;
    }

    return obj;
  }

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
}

export default DataUtils;
