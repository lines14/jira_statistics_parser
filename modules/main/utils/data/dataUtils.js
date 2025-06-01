/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import JSONLoader from './JSONLoader.js';
import TimeUtils from '../time/timeUtils.js';
import Randomizer from '../random/randomizer.js';

class DataUtils {
  static saveToJSON(obj) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./artifacts/${name}.json`, JSON.stringify(data, replacer, 4));
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

  static filterAssignedEntitiesMoreThanHalfMinute(assigneeEntityChanges) {
    return assigneeEntityChanges.filter((assigneeEntityChange, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      const diff = assigneeEntityChange.created - prev.created;
      return diff >= JSONLoader.config.halfMinute;
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
      overlap,
      overlapDuration,
      createdTransitionFromStatus: endFirstInterval.created,
      createdTransitionFromAssignee: endSecondInterval.created,
      transitionFromStatusID: endFirstInterval.ID,
      transitionFromAssigneeID: endSecondInterval.ID,
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

  static getStatusEnds(changelog) {
    const statusEnds = [];
    for (const element of changelog) {
      element.items.forEach((item) => {
        if (item.field === 'status' && item.fromString) {
          statusEnds.push({
            transitionFrom: item.fromString,
            created: element.created,
            ID: Randomizer.getRandomString(false, false, true, false, false, 20, 20),
          });
        }
      });
    }

    // filter if status assigned more than half minute
    this.convertTimestampsToDateObjects(statusEnds);
    return this.filterAssignedEntitiesMoreThanHalfMinute(statusEnds);
  }

  static getDevStatusEnds(changelog) {
    return this.getStatusEnds(changelog)
      .filter((statusEnd) => JSONLoader.config.devIssueStatuses
        .includes(statusEnd.transitionFrom.toUpperCase()));
  }

  static getAssigneeChanges(changelog) {
    const assigneeChanges = [];
    for (const element of changelog) {
      element.items.forEach((item) => {
        if (item.field === 'assignee' && item.fromString) {
          assigneeChanges.push({
            transitionFrom: item.fromString,
            transitionTo: item.toString,
            created: element.created,
            ID: Randomizer.getRandomString(false, false, true, false, false, 20, 20),
          });
        }
      });
    }

    // filter if assignee assigned more than half minute
    this.convertTimestampsToDateObjects(assigneeChanges);
    return this.filterAssignedEntitiesMoreThanHalfMinute(assigneeChanges);
  }

  static getDeveloperChanges(changelog) {
    return this.getAssigneeChanges(changelog)
      .filter((assigneeChange) => JSONLoader.config.developers
        .includes(assigneeChange.transitionFrom));
  }

  static getAssigneesWithStatuses(
    statusEnds,
    assigneeChanges,
    initialTimestamp,
  ) {
    statusEnds.unshift(initialTimestamp);
    assigneeChanges.unshift(initialTimestamp);

    // get time intervals between statuses changes
    const statusEndTimeIntervals = this.getTimeIntervals(statusEnds);

    // get time intervals between assignees changes
    const assigneeChangeTimeIntervals = this.getTimeIntervals(assigneeChanges);

    // get assignees with statuses at the same and longest amount of time
    return statusEndTimeIntervals
      .map((statusEndTimeInterval) => assigneeChangeTimeIntervals
        .map((assigneeChangeTimeInterval) => this
          .getAssigneeWithStatus(statusEndTimeInterval, assigneeChangeTimeInterval)))
      .map((assigneeWithStatus) => [assigneeWithStatus
        .reduce((overlappedAssignee, currentElement) => {
          if (!overlappedAssignee
            || (currentElement.overlapDuration
              ?? 0) > (overlappedAssignee.overlapDuration ?? 0)) {
            return currentElement;
          }

          return overlappedAssignee;
        }, null)]
        .filter((nestedAssigneeWithStatus) => nestedAssigneeWithStatus?.overlap));
  }

  // search previous developer assignee before bug found
  static linkDevelopersWithBugs(testedIssue) {
    if (testedIssue.commentsWithBugs.length > 0) {
      return testedIssue.commentsWithBugs.map((commentWithBug) => {
        const linkedAssigneeWithBug = { ...commentWithBug };
        const commentCreatedDateObj = TimeUtils
          .convertTimestampToDateObject(commentWithBug.commentCreated);
        const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
        const initialTimestamp = {
          transitionFrom: JSONLoader.config.initIssueStatus,
          created: TimeUtils.convertTimestampToDateObject(sortedChangelog[0].created),
        };

        // get all dev statuses ends from issue history, includes
        // only BACKLOG, TO DO, REOPEN and IN PROGRESS statuses
        const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

        // get developer assignee changes from issue history
        const assigneeChanges = this.getDeveloperChanges(sortedChangelog);

        // filter not includes issues with only one assignee or status due to lack of transition
        if (assigneeChanges.length > 0 && devStatusEnds.length > 0) {
          // get developer assignees with dev statuses at the same time
          const overlappedAssignees = this.getAssigneesWithStatuses(
            devStatusEnds,
            assigneeChanges,
            initialTimestamp,
          );

          // get last previous developer assignee with dev status before bug found
          const lastPreviousDevAssignee = overlappedAssignees.flat()
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

          linkedAssigneeWithBug.lastPreviousDevAssignee = lastPreviousDevAssignee;
        }

        return linkedAssigneeWithBug;
      });
    }

    return [];
  }

  static getIssueDevelopers(testedIssue) {
    const sortedChangelog = this.sortByTimestamps(testedIssue.changelog);
    const initialTimestamp = {
      transitionFrom: JSONLoader.config.initIssueStatus,
      created: TimeUtils.convertTimestampToDateObject(sortedChangelog[0].created),
    };

    // get all dev statuses ends from issue history, includes
    // only BACKLOG, TO DO, REOPEN and IN PROGRESS statuses
    const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

    // get developer assignee changes from issue history
    const assigneeChanges = this.getDeveloperChanges(sortedChangelog);

    // get developer assignees with dev statuses at the same time
    return this.getAssigneesWithStatuses(
      devStatusEnds,
      assigneeChanges,
      initialTimestamp,
    );
  }

  static fillBugsPerEntities(
    accumulator,
    testedIssuesWithBugsArr,
    key,
    entities,
    overallBugsCount,
  ) {
    entities.forEach((el) => {
      let bugsCount = 0;
      testedIssuesWithBugsArr.forEach((testedIssueWithBugs) => {
        if (testedIssueWithBugs[key] === el) {
          bugsCount += testedIssueWithBugs.bugsCount;
        }
      });

      const bugsCountPerOverallBugsCountRatio = Number((bugsCount / overallBugsCount).toFixed(2));
      accumulator[el] = { bugsCount, bugsCountPerOverallBugsCountRatio };
    });
  }

  static getDevelopersWorkload(issuesArr) {
    return issuesArr
      .filter((issue) => !JSONLoader.config.debugIssues
        .includes(issue.key))
      .map((issue) => {
        const developers = [...new Set(DataUtils.getIssueDevelopers(issue)
          .flat()
          .map((developer) => developer.transitionFromAssignee))];

        return {
          projectName: issue.projectName,
          developers: developers.length > 0
            ? developers
            : [JSONLoader.config.issueWithoutAssignee],
        };
      });
  }

  static averageRatio(ratiosArr) {
    return Number((ratiosArr.reduce((sum, val) => sum + val, 0) / ratiosArr.length).toFixed(2));
  }
}

export default DataUtils;
