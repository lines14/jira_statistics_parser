import fs from 'fs';
import JSONLoader from './JSONLoader.js';

class DataUtils {
  static saveToJSON(obj) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./artifacts/${name}.json`, JSON.stringify(data, replacer, 4));
  }

  static filterCommentsWithStatuses(comments) {
    return comments
      .flatMap((comment) => comment.body.content
        .flatMap((content) => content.content
          ?.filter((nestedContent) => nestedContent.type === 'status'
    && JSONLoader.config.statuses.includes(nestedContent.attrs.text)) || []));
  }
}

export default DataUtils;
