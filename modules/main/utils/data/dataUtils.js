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

  static filterCommentsWithStatuses(data, commentCreatedAt) {
    const results = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        results.push(...this.filterCommentsWithStatuses(item, commentCreatedAt));
      }
    } else if (data !== null && typeof data === 'object') {
      if (data.created) commentCreatedAt = data.created;
      if (data.type === 'status' && JSONLoader.config.statuses.includes(data.attrs.text.toUpperCase())) {
        if (commentCreatedAt) data.commentCreatedAt = commentCreatedAt;
        results.push(data);
      }

      for (const key in data) {
        if (Object.hasOwn(data, key)) {
          results.push(...this.filterCommentsWithStatuses(data[key], commentCreatedAt));
        }
      }
    }

    return results;
  }
}

export default DataUtils;
