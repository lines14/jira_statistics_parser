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

  static reformatDateFromDMYToISO(date) {
    return moment(date, JSONLoader.config.datesFormatDMY)
      .format(JSONLoader.config.datesFormatISO);
  }

  static reformatDateFromISOToDMY(date) {
    return moment(date, JSONLoader.config.datesFormatISO)
      .format(JSONLoader.config.datesFormatDMY);
  }
}

export default TimeUtils;
