import 'moment/locale/ru.js';
import moment from 'moment';
import dotenv from 'dotenv';
import JSONLoader from '../data/JSONLoader.js';

dotenv.config({ override: true });

class TimeUtils {
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

  static reformatDateFromISOToYMD(date) {
    return moment(date, JSONLoader.config.datesFormatISO)
      .format(JSONLoader.config.datesFormatYMD);
  }

  static convertTimestampToDateObject(timestamp) {
    return timestamp instanceof Date
      ? timestamp
      : new Date(timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  }

  static getDates(count, unitOfTime) {
    const dateEnd = process.env.COMMENTS_WITH_BUGS_CREATED_TO_DATE_YMD
      ? process.env.COMMENTS_WITH_BUGS_CREATED_TO_DATE_YMD
      : this.reformatDateFromISOToYMD(moment());

    const dateBegin = process.env.COMMENTS_WITH_BUGS_CREATED_FROM_DATE_YMD
      ? process.env.COMMENTS_WITH_BUGS_CREATED_FROM_DATE_YMD
      : this.reformatDateFromISOToYMD(moment(dateEnd).subtract(count, unitOfTime));

    return { dateBegin, dateEnd };
  }

  static getMonthName() {
    moment.locale('ru');
    const { dateBegin } = this.getDates(...JSONLoader.config.timeDecrement);

    return moment(dateBegin, JSONLoader.config.datesFormatYMD)
      .format(JSONLoader.config.datesFormatMonthName);
  }
}

export default TimeUtils;
