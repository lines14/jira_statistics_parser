import fs from 'fs';

class DataUtils {
  static saveToJSON(obj) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./artifacts/${name}.json`, JSON.stringify(data, replacer, 4));
  }

  static filterCommentsWithStatuses(data) {
    let results = [];
  
    if (Array.isArray(data)) {
      for (const item of data) {
        results.push(...this.filterCommentsWithStatuses(item));
      }
    } else if (data !== null && typeof data === 'object') {
      if (data.type === 'status') {
        results.push(data);
      }
      for (const key in data) {
        results.push(...this.filterCommentsWithStatuses(data[key]));
      }
    }
  
    return results;
  }
}

export default DataUtils;
