/* eslint no-param-reassign: ["off"] */
/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import JSONLoader from './JSONLoader.js';

class DataUtils {
  static saveToJSON(obj) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./artifacts/${name}.json`, JSON.stringify(data, replacer, 4));
  }

  static normalizeTimestamp(timestamp) { 
    return timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  };

  static sortByTimestamps(changelog) {
    return changelog.sort((a, b) => new Date(this.normalizeTimestamp(a.created)) - new Date(this.normalizeTimestamp(b.created)));
  }

  static convertTimestampsToDateObjects(changelogItems) { 
    return changelogItems.map((changelogItem) => ({ transitionFrom: changelogItem.transitionFrom, created: this.normalizeTimestamp(changelogItem.created) })).map((changelogItem) => ({ transitionFrom: changelogItem.transitionFrom, created: new Date(changelogItem.created) }));
  }

  static getTimeIntervals(changelogItems) {
    const timeIntervals = [];
    for (let i = 0; i < changelogItems.length - 1; i++) {
      timeIntervals.push([changelogItems[i], changelogItems[i + 1]]);
    }

    return timeIntervals;
  }

  static intervalsOverlapping([startFirstInterval, endFirstInterval], [startSecondInterval, endSecondInterval]) {
    return { transitionFrom: endSecondInterval.transitionFrom, overlap: startFirstInterval.created < endSecondInterval.created && startSecondInterval.created < endFirstInterval.created };
  }

  static checkIntervalsOverlap(firstIntervals, secondIntervals) {
    return firstIntervals.map((firstInterval) => secondIntervals.map((secondInterval) => this.intervalsOverlapping(firstInterval, secondInterval)));
  }

  static filterCommentsWithStatuses(data, commentCreated) {
    const results = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        results.push(...this.filterCommentsWithStatuses(item, commentCreated));
      }
    } else if (data !== null && typeof data === 'object') {
      if (data.created) commentCreated = data.created;
      if (data.type === 'status' && JSONLoader.config.commentStatuses.includes(data.attrs.text.toUpperCase())) {
        if (commentCreated) data.commentCreated = commentCreated;
        results.push(data);
      }

      for (const key in data) {
        if (Object.hasOwn(data, key)) {
          results.push(...this.filterCommentsWithStatuses(data[key], commentCreated));
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
        const linkedCommentWithBug = { ...commentWithBug };
        const sortedChangelog = this.sortByTimestamps(issueWithBugs.changelog);
        const initialTimestamp = { 
          transitionFrom: 'INIT TASK', 
          created: sortedChangelog[0].created 
        };

        for (const element of sortedChangelog) {
          element.items.forEach((item) => { // filter includes only BACKLOG, TO DO and IN PROGRESS statuses
            if (item.field === 'status' && item.fromString && JSONLoader.config.issueStatuses.includes(item.fromString.toUpperCase())) {
              devStatusEnds.push({ transitionFrom: item.fromString, created: element.created });
            }
          });
        }

        for (const element of sortedChangelog) {
          element.items.forEach((item) => {
            if (item.field === 'assignee' && item.fromString) {
              assigneeChanges.push({ transitionFrom: item.fromString, created: element.created });
            }
          });
        }
        
        // filter not includes issues with only one assignee or status due to lack of transition
        if (assigneeChanges.length > 0 && devStatusEnds.length > 0) {
          devStatusEnds.unshift(initialTimestamp);
          assigneeChanges.unshift(initialTimestamp);
          const devStatusEndTimeIntervals = this.getTimeIntervals(this.convertTimestampsToDateObjects(devStatusEnds));
          const assigneeChangeTimeIntervals = this.getTimeIntervals(this.convertTimestampsToDateObjects(assigneeChanges));
          const result = this.checkIntervalsOverlap(devStatusEndTimeIntervals, assigneeChangeTimeIntervals);
          console.log(result);
          return linkedCommentWithBug;
        }
      });
    }
  }
}

export default DataUtils;











  // static getTimeIntervalsOverlapTime(startFirstInterval, endFirstInterval, startSecondInterval, endSecondInterval) {
  //   const overlapStart = new Date(Math.max(startFirstInterval.getTime(), startSecondInterval.getTime()));
  //   const overlapEnd = new Date(Math.min(endFirstInterval.getTime(), endSecondInterval.getTime()));
  //   return Math.max(0, overlapEnd - overlapStart);
  // }

  // static checkTimeIntervalsOverlapMoreThanHalf(firstIntervals, secondIntervals) {
  //   return firstIntervals.map(([startFirstInterval, endFirstInterval]) => {
  //     const firstIntervalDuration = endFirstInterval.created - startFirstInterval.created;
  //     return secondIntervals.some(([startSecondInterval, endSecondInterval]) => {
  //       const secondIntervalDuration = endSecondInterval.created - startSecondInterval.created;
  //       const overlap = this.getTimeIntervalsOverlapTime(startFirstInterval.created, endFirstInterval.created, startSecondInterval.created, endSecondInterval.created);
  //       return { transitionFrom: endSecondInterval.transitionFrom, longOverlap: overlap > 0.5 * firstIntervalDuration || overlap > 0.5 * secondIntervalDuration };
  //     });
  //   });
  // }

  //   static checkTimeIntervalsOverlapMoreThanHalf(firstIntervals, secondIntervals) {
  //   return firstIntervals.map(([startFirstInterval, endFirstInterval]) => {
  //     return secondIntervals.map(([startSecondInterval, endSecondInterval]) => {
  //       const overlap = this.getTimeIntervalsOverlapTime(startFirstInterval.created, endFirstInterval.created, startSecondInterval.created, endSecondInterval.created);
  //       // return { transitionFrom: endSecondInterval.transitionFrom, overlap: overlap > 0 };
  //       return  overlap > 0;
  //     });
  //   });
  // }

  // static checkIntervalsOverlap(firstIntervals, secondIntervals) {
  //   return firstIntervals.map(([startA, endA]) => {
  //     return secondIntervals.some(([startB, endB]) => {
  //       return this.getTimeIntervalsOverlapTime(
  //         startA.created, endA.created,
  //         startB.created, endB.created
  //       ) > 0;
  //     });
  //   });
  // }
