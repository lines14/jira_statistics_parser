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

  static sortByTimestamps(changelog) {
    const normalize = (timestamp) => timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    return changelog.sort((a, b) => new Date(normalize(a.created)) - new Date(normalize(b.created)));
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
      // issueWithBugs.changelog.forEach((element) => console.log(element.items.length));
      // const linkedCommentsWithBugs = issueWithBugs.changelog.map((element) => ({ created: element.created, id: element.id,   }))
      const linkedCommentsWithBugs = issueWithBugs.commentsWithBugs.map((commentWithBug) => {
        const assigneeChangeTimestamps = [];
        const workingStatusEndTimestamps = [];
        const linkedCommentWithBug = { ...commentWithBug };
        const sortedChangelog = this.sortByTimestamps(issueWithBugs.changelog);
        const initialTimestamp = sortedChangelog[0].created;
        for (const element of sortedChangelog) {
          if (element.items.some((item) => item.field === 'status' 
          && item.fromString 
          && JSONLoader.config.issueStatuses.includes(item.fromString.toUpperCase()))) {
            workingStatusEndTimestamps.push(element.created);
          }
        }

        workingStatusEndTimestamps.unshift(initialTimestamp);
        for (const element of sortedChangelog) {
          if (element.items.some((item) => item.field === 'assignee' 
          && item.fromString)) {
            assigneeChangeTimestamps.push(element.created);
          }
        }
        
        assigneeChangeTimestamps.unshift(initialTimestamp);
        console.log(workingStatusEndTimestamps);
        return linkedCommentWithBug;
      });
      // throw new Error('kek');
    }
  }
}

export default DataUtils;
