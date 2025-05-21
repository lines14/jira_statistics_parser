import fs from 'fs';

class DataUtils {
  static saveToJSON(collection) {
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./output_collections/${collection.name}.json`, JSON.stringify(collection, replacer, 4));
  }
}

export default DataUtils;
