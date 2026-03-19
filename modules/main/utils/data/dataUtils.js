/* eslint no-restricted-syntax: ['off', 'ForInStatement'] */
import fs from 'fs';
import dotenv from 'dotenv';
import JSONLoader from './JSONLoader.js';

dotenv.config({ override: true });

class DataUtils {
  static saveToJSON(obj, options = { folder: 'artifacts' }) {
    const [name] = Object.keys(obj);
    const data = obj[name];
    const replacer = (key, value) => (typeof value === 'undefined' ? null : value);
    fs.writeFileSync(`./${options.folder}/${name}.json`, JSON.stringify(data, replacer, 4));
  }

  static averageRatio(ratiosArr) {
    const cleanRatiosArr = ratiosArr.filter((ratio) => ratio !== 0 && !Number.isNaN(ratio));

    return Number((cleanRatiosArr.reduce((sum, val) => sum + val, 0)
    / cleanRatiosArr.length).toFixed(JSONLoader.config.decimalPlaces));
  }

  static getDeveloperNamesByAccountIDs(users) {
    const developerAccountIDs = JSON.parse(process.env.DEVELOPERS)
      .map((el) => Object.values(el).pop());

    return [...new Set(users.filter((user) => developerAccountIDs
      .some((ID) => user.accountId === ID))
      .map((user) => user.displayName))];
  }

  static getReporterNamesByAccountIDs(users) {
    const reporterAccountIDs = JSON.parse(process.env.REPORTERS)
      .map((el) => Object.values(el).pop());

    return [...new Set(users.filter((user) => reporterAccountIDs
      .some((ID) => user.accountId === ID))
      .map((user) => user.displayName))];
  }

  // get values from summary
  static extractPropertyByName(title, obj, propertyNames) {
    const result = {};
    if (typeof obj !== 'object' || obj === null) return { result, propertyNames };
    const isFlat = propertyNames.some((propertyName) => propertyName in obj);
    if (isFlat) {
      for (const prop of propertyNames) {
        if (prop in obj) {
          result[prop] = obj[prop];
        }
      }

      const missingFields = propertyNames.filter((propertyName) => !(propertyName in result));
      if (missingFields.length > 0) {
        throw new Error(`Поля для диаграммы "${title}" не найдены в summary: ${missingFields.join(', ')}`);
      }

      return { result, propertyNames };
    }

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        const filtered = {};
        for (const prop of propertyNames) {
          if (prop in value) filtered[prop] = value[prop];
        }

        if (Object.keys(filtered).length > 0) {
          result[key] = filtered;
        }
      }
    }

    const foundKeys = Object.values(result).flatMap((innerObj) => Object.keys(innerObj));
    const nestedMissingFields = propertyNames
      .filter((propertyName) => !foundKeys.includes(propertyName));

    if (nestedMissingFields.length > 0) {
      throw new Error(`Поля для диаграммы "${title}" не найдены в summary: ${nestedMissingFields.join(', ')}`);
    }

    return { result, propertyNames };
  }

  // map summary keys to cyrillic diagram names
  static setCyrillicNames(obj, namesMapping) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.setCyrillicNames(item, namesMapping));
    } if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = namesMapping[key] || key;
        newObj[newKey] = this.setCyrillicNames(value, namesMapping);
      }

      return newObj;
    }

    return obj;
  }

  static defineDiagramStructure(options = {}) {
    const {
      title,
      yLabel,
      xLabel,
      outputSubFolder,
      source,
      fields,
    } = options;

    const diagram = {};
    diagram.title = title;
    if (yLabel) diagram.yLabel = yLabel;
    if (xLabel) diagram.xLabel = xLabel;
    if (outputSubFolder) diagram.outputSubFolder = outputSubFolder;

    // validate required fields in summary while extracting, then trim empty values
    const data = this.extractPropertyByName(title, source, fields);
    data.result = this.trimEmptyNestedObj(this.trimZeroAndNullValues(data.result));
    diagram.data = data;

    return diagram;
  }

  static trimEmptyNestedObj(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const trimmedObj = this.trimEmptyNestedObj(value);
      const isEmpty = trimmedObj && typeof trimmedObj === 'object' && !Array.isArray(trimmedObj)
          && Object.keys(trimmedObj).length === 0;
      if (!isEmpty) {
        result[key] = trimmedObj;
      }
    }

    return result;
  }

  static trimZeroAndNullValues(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.trimZeroAndNullValues(value);
      } else if (value !== 0 && value !== null) {
        result[key] = value;
      }
    }

    return result;
  }
}

export default DataUtils;
