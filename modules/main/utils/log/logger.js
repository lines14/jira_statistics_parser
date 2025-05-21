import path from 'path';
import moment from 'moment';
import { filesize } from 'filesize';
import { stat, promises as fsPromises } from 'fs';
import JSONLoader from '../data/JSONLoader.js';

const filePath = path.join(path.resolve(), 'artifacts', 'log.txt');

class Logger {
  static async log(step) {
    const timeStamp = moment().format().slice(0, 19).replace('T', ' ');
    await fsPromises.appendFile(filePath, `${timeStamp} ${step}\n`);
    await this.hideLogBodies(step);
    await this.autoclearLog();
  }

  static async hideLogBodies(step) {
    if (JSONLoader.config.hiddenLogBodies && step.includes('[req]')) {
      const words = step.split(' ');
      const firstPart = words.slice(0, 3).join(' ');
      const secondPart = words.slice(words.length - 2).join(' ');
      console.log(`  ${firstPart} ${secondPart}`); // eslint-disable-line no-console
    } else {
      console.log(`  ${step}`); // eslint-disable-line no-console
    }
  }

  static async autoclearLog() {
    stat(filePath, async (err, stats) => {
      const logSize = stats.size / (1024 * 1024);
      if (logSize > JSONLoader.config.logMaxSizeMegabytes) {
        await fsPromises.writeFile(filePath, '');
        await this.log(`[inf] ▶ Файл лога очищен из-за превышения лимита занимаемой памяти (${filesize(logSize)})`);
      }
    });
  }
}

export default Logger;
