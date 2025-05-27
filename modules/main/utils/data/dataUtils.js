/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import JSONLoader from './JSONLoader.js';
import Randomizer from '../random/randomizer.js';

class DataUtils {
  static saveToJSON(obj) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./artifacts/${name}.json`, JSON.stringify(data, replacer, 4));
  }

  static convertTimestampToDateObject(timestamp) {
    return new Date(timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  }

  static sortByTimestamps(changelog) {
    return changelog.sort((a, b) => this.convertTimestampToDateObject(a.created)
    - this.convertTimestampToDateObject(b.created));
  }

  static firstTimestampIsAfterSecondTimestamp(firstTimestamp, secondTimestamp) {
    return this.convertTimestampToDateObject(firstTimestamp)
    > this.convertTimestampToDateObject(secondTimestamp);
  }

  static convertTimestampsToDateObjects(changelogItems) {
    return changelogItems
      .map((changelogItem) => ({
        ...changelogItem,
        created: this.convertTimestampToDateObject(changelogItem.created),
      }));
  }

  // filter if developer assigned more than minute
  static filterDevelopersAndMissclicks(assigneeChanges) {
    return assigneeChanges.filter((assigneeChange, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      const diff = assigneeChange.created - prev.created;
      return diff >= JSONLoader.config.oneMinute;
    }).filter((assigneeChange) => JSONLoader.config.developers
      .includes(assigneeChange.transitionFrom)
    || assigneeChange.transitionFrom === JSONLoader.config.initIssueStatus);
  }

  static getTimeIntervals(changelogItems) {
    const timeIntervals = [];
    for (let i = 0; i < changelogItems.length - 1; i += 1) {
      timeIntervals.push([changelogItems[i], changelogItems[i + 1]]);
    }

    return timeIntervals;
  }

  // get developer assignee with dev status overlapping indicator
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

  // get each developer assignee to each dev status intersections array
  static getAssigneesWithStatuses(firstIntervals, secondIntervals) {
    return firstIntervals
      .map((firstInterval) => secondIntervals
        .map((secondInterval) => this.getAssigneeWithStatus(firstInterval, secondInterval)));
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

  // search previous developer assignee before bug found
  static linkDevelopersWithBugs(issueWithBugs) {
    if (issueWithBugs.commentsWithBugs.length > 0) {
      return issueWithBugs.commentsWithBugs.map((commentWithBug) => {
        const devStatusEnds = [];
        const assigneeChanges = [];
        const linkedAssigneeWithBug = { ...commentWithBug };

        const commentCreatedDateObj = this
          .convertTimestampToDateObject(commentWithBug.commentCreated);
        const sortedChangelog = this.sortByTimestamps(issueWithBugs.changelog);

        const initialTimestamp = {
          transitionFrom: JSONLoader.config.initIssueStatus,
          created: sortedChangelog[0].created,
        };

        // get all dev statuses ends from issue history, includes
        // only BACKLOG, TO DO, REOPEN and IN PROGRESS statuses
        for (const element of sortedChangelog) {
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

        // get all developer assignees changes from issue history
        for (const element of sortedChangelog) {
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

        // filter not includes issues with only one assignee or status due to lack of transition
        if (assigneeChanges.length > 0 && devStatusEnds.length > 0) {
          devStatusEnds.unshift(initialTimestamp);
          assigneeChanges.unshift(initialTimestamp);

          // get time intervals between dev statuses and developer assignees changes
          const devStatusEndTimeIntervals = this
            .getTimeIntervals(this.convertTimestampsToDateObjects(devStatusEnds));

          const filteredAssigneeChanges = this.filterDevelopersAndMissclicks(this
            .convertTimestampsToDateObjects(assigneeChanges));
          const assigneeChangeTimeIntervals = this.getTimeIntervals(filteredAssigneeChanges);

          // get developer assignees with dev statuses at the same time
          const overlappedAssignees = this.getAssigneesWithStatuses(
            devStatusEndTimeIntervals,
            assigneeChangeTimeIntervals,
          ).map((assigneeWithStatus) => assigneeWithStatus
            .filter((nestedAssigneeWithStatus) => nestedAssigneeWithStatus.overlap));

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
}

export default DataUtils;
