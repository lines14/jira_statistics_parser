import moment from 'moment';
import JSONLoader from '../data/JSONLoader.js';

class TimeUtils {
  static today() {
    return moment();
  }

  static reformatDateFromYMDToDMY(date) {
    return moment(date, JSONLoader.config.datesFormatYMD)
      .format(JSONLoader.config.datesFormatDMY);
  }

  static reformatDateFromDMYToYMD(date) {
    return moment(date, JSONLoader.config.datesFormatDMY)
      .format(JSONLoader.config.datesFormatYMD);
  }

  static reformatDateFromISOToDMY(date) {
    return moment(date, JSONLoader.config.datesFormatISO)
      .format(JSONLoader.config.datesFormatDMY);
  }

  static convertTimestampToDateObject(timestamp) {
    return timestamp instanceof Date
      ? timestamp
      : new Date(timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  }
}

export default TimeUtils;
