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

  static filterAssignedMoreThanMinute(assigneeChanges) {
    return assigneeChanges.filter((assigneeChange, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      const diff = assigneeChange.created - prev.created;
      return diff >= JSONLoader.config.oneMinute;
    });
  }

  // filter if developer assigned more than minute
  static filterDevelopersAndMissclicks(assigneeChanges) {
    return this.filterAssignedMoreThanMinute(assigneeChanges)
      .filter((assigneeChange) => JSONLoader.config.developers
        .includes(assigneeChange.transitionFrom)
    || assigneeChange.transitionFrom === JSONLoader.config.initIssueStatus);
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

  static getDevStatusEnds(changelog) {
    const devStatusEnds = [];
    for (const element of changelog) {
      element.items.forEach((item) => {
        if (item.field === 'status'
          && item.fromString
          && JSONLoader.config.devIssueStatuses.includes(item.fromString.toUpperCase())) {
          devStatusEnds.push({
            transitionFrom: item.fromString,
            created: element.created,
            ID: Randomizer.getRandomString(false, false, true, false, false, 20, 20),
          });
        }
      });
    }

    return devStatusEnds;
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

    return assigneeChanges;
  }

  static getAssigneesWithStatuses(
    statusEnds,
    assigneeChanges,
    initialTimestamp,
    options = { developers: true },
  ) {
    statusEnds.unshift(initialTimestamp);
    assigneeChanges.unshift(initialTimestamp);

    // get time intervals between statuses changes
    this.convertTimestampsToDateObjects(statusEnds);
    const statusEndTimeIntervals = this.getTimeIntervals(statusEnds);

    // filter assignees and get time intervals between assignees changes
    this.convertTimestampsToDateObjects(assigneeChanges);
    const filteredAssigneeChanges = options.developers
      ? this.filterDevelopersAndMissclicks(assigneeChanges)
      : this.filterDevelopersAndMissclicks(assigneeChanges);
    const assigneeChangeTimeIntervals = this.getTimeIntervals(filteredAssigneeChanges);

    // get assignees with statuses at the same time
    return statusEndTimeIntervals
      .map((statusEndTimeInterval) => assigneeChangeTimeIntervals
        .map((assigneeChangeTimeInterval) => this
          .getAssigneeWithStatus(statusEndTimeInterval, assigneeChangeTimeInterval)))
      .map((assigneeWithStatus) => assigneeWithStatus
        .filter((nestedAssigneeWithStatus) => nestedAssigneeWithStatus.overlap));
  }

  // search previous developer assignee before bug found
  static linkDevelopersWithBugs(issueWithBugs) {
    if (issueWithBugs.commentsWithBugs.length > 0) {
      return issueWithBugs.commentsWithBugs.map((commentWithBug) => {
        const linkedAssigneeWithBug = { ...commentWithBug };
        const commentCreatedDateObj = TimeUtils
          .convertTimestampToDateObject(commentWithBug.commentCreated);
        const sortedChangelog = this.sortByTimestamps(issueWithBugs.changelog);
        const initialTimestamp = {
          transitionFrom: JSONLoader.config.initIssueStatus,
          created: sortedChangelog[0].created,
        };

        // get all dev statuses ends from issue history, includes
        // only BACKLOG, TO DO, REOPEN and IN PROGRESS statuses
        const devStatusEnds = this.getDevStatusEnds(sortedChangelog);

        // get all assignees changes from issue history
        const assigneeChanges = this.getAssigneeChanges(sortedChangelog);

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
}

export default DataUtils;
