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

  static normalizeTimestamp(timestamp) {
    return timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  }

  static sortByTimestamps(changelog) {
    return changelog.sort((a, b) => new Date(this
      .normalizeTimestamp(a.created)) - new Date(this.normalizeTimestamp(b.created)));
  }

  static firstTimestampIsAfterSecondTimestamp(firstTimestamp, secondTimestamp) {
    const firstDate = new Date(this.normalize(firstTimestamp));
    const secondDate = new Date(this.normalize(secondTimestamp));
    return firstDate > secondDate;
  }

  static convertTimestampsToDateObjects(changelogItems) {
    return changelogItems
      .map((changelogItem) => ({
        ...changelogItem,
        created: this.normalizeTimestamp(changelogItem.created),
      })).map((changelogItem) => ({
        ...changelogItem,
        created: new Date(changelogItem.created),
      }));
  }

  static filterDevsAndMissclicks(assigneeChanges) {
    return assigneeChanges.filter((assigneeChange, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      const diff = assigneeChange.created - prev.created;
      return diff >= 60000;
    })
      .filter((assigneeChange) => JSONLoader.config.developers
        .includes(assigneeChange.transitionFrom)
    || assigneeChange.transitionFrom === 'INIT TASK');
  }

  static getTimeIntervals(changelogItems) {
    const timeIntervals = [];
    for (let i = 0; i < changelogItems.length - 1; i += 1) {
      timeIntervals.push([changelogItems[i], changelogItems[i + 1]]);
    }

    return timeIntervals;
  }

  static intervalsOverlapping(
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
      transitionFromStatusHash: endFirstInterval.hash,
      transitionFromAssigneeHash: endSecondInterval.hash
    };
  }

  static checkIntervalsOverlap(firstIntervals, secondIntervals) {
    return firstIntervals
      .map((firstInterval) => secondIntervals
        .map((secondInterval) => this.intervalsOverlapping(firstInterval, secondInterval)));
  }

  static filterCommentsWithStatuses(data, commentCreated, commentAuthor) {
    const results = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        results.push(...this.filterCommentsWithStatuses(item, commentCreated, commentAuthor));
      }
    } else if (data !== null && typeof data === 'object') {
      if (data.created) commentCreated = data.created;
      if (data.author) commentAuthor = data.author.displayName;
      if (data.type === 'status' && JSONLoader.config.commentStatuses.includes(data.attrs.text.toUpperCase())) {
        if (commentCreated) data.commentCreated = commentCreated;
        if (commentAuthor) data.commentAuthor = commentAuthor;
        results.push(data);
      }

      for (const key in data) {
        if (Object.hasOwn(data, key)) {
          results.push(...this.filterCommentsWithStatuses(
            data[key],
            commentCreated,
            commentAuthor,
          ));
        }
      }
    }

    return results;
  }

  static linkDevsWithBugs(issueWithBugs) {
    if (issueWithBugs.commentsWithBugs.length > 0) {
      return issueWithBugs.commentsWithBugs.map((commentWithBug) => {
        const devStatusEnds = [];
        const assigneeChanges = [];
        const linkedAssigneeWithBug = { ...commentWithBug };

        const commentCreatedDateObj = new Date(this
          .normalizeTimestamp(commentWithBug.commentCreated));
        const sortedChangelog = this.sortByTimestamps(issueWithBugs.changelog);

        const initialTimestamp = {
          transitionFrom: JSONLoader.config.initIssueStatus,
          created: sortedChangelog[0].created,
        };

        for (const element of sortedChangelog) {
          element.items.forEach((item) => { // includes only BACKLOG, TO DO and IN PROGRESS statuses
            if (item.field === 'status'
              && item.fromString
              && JSONLoader.config.devIssueStatuses.includes(item.fromString.toUpperCase())) {
              devStatusEnds.push({ 
                transitionFrom: item.fromString, 
                created: element.created,
                hash: Randomizer.getRandomString(false, false, true, false, false, 20, 20)
              });
            }
          });
        }

        for (const element of sortedChangelog) {
          element.items.forEach((item) => {
            if (item.field === 'assignee' && item.fromString) {
              assigneeChanges.push({
                transitionFrom: item.fromString,
                transitionTo: item.toString,
                created: element.created,
                hash: Randomizer.getRandomString(false, false, true, false, false, 20, 20)
              });
            }
          });
        }

        // filter not includes issues with only one assignee or status due to lack of transition
        if (assigneeChanges.length > 0 && devStatusEnds.length > 0) {
          devStatusEnds.unshift(initialTimestamp);
          assigneeChanges.unshift(initialTimestamp);

          const devStatusEndTimeIntervals = this
            .getTimeIntervals(this.convertTimestampsToDateObjects(devStatusEnds));

          const filteredAssigneeChanges = this.filterDevsAndMissclicks(this
            .convertTimestampsToDateObjects(assigneeChanges));

          const assigneeChangeTimeIntervals = this.getTimeIntervals(filteredAssigneeChanges);

          const changedAssignees = this.checkIntervalsOverlap(
            devStatusEndTimeIntervals,
            assigneeChangeTimeIntervals,
          );

          const overlappedAssignees = changedAssignees
            .map((changedAssignee) => changedAssignee
            .filter((changedAssignee) => changedAssignee.overlap));

          const lastPreviousDevAssignee = overlappedAssignees
            .flat()
            .filter((overlappedAssignee) => 
              overlappedAssignee
              .createdTransitionFromAssignee <= commentCreatedDateObj
              && overlappedAssignee
              .createdTransitionFromStatus <= commentCreatedDateObj
            )
            .reduce((prev, curr) => {
              if (!prev) return curr;
              return curr.createdTransitionFromStatus > prev.createdTransitionFromStatus
              && curr.createdTransitionFromAssignee > prev.createdTransitionFromAssignee
                ? curr
                : prev;
            }, null);

          linkedAssigneeWithBug.lastPreviousDevAssignee = lastPreviousDevAssignee
        }

        return linkedAssigneeWithBug;
      });
    }

    return [];
  }
}

export default DataUtils;
