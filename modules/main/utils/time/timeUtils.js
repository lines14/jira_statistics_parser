/* eslint no-param-reassign: ["off"] */
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

  static reformatDateFromYMDToISO(date) {
    return moment(date, JSONLoader.config.datesFormatYMD)
      .format(JSONLoader.config.datesFormatISO);
  }

  static convertTimestampToDateObject(timestamp) {
    return timestamp instanceof Date
      ? timestamp
      : new Date(timestamp.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  }

  static addDay(date) {
    return this.reformatDateFromISOToYMD(moment(date).add(1, 'day'));
  }

  static subtractDay(date) {
    return this.reformatDateFromISOToYMD(moment(date).subtract(1, 'day'));
  }

  static getDates(isScheduled, count, unitOfTime) {
    let endMoment;

    if (isScheduled) {
      endMoment = moment();
    } else {
      const envEndDate = process.env.STATUS_CHANGED_FROM_BACKLOG_TO_DATE_YMD;
      endMoment = envEndDate ? moment(envEndDate) : moment();
    }

    let beginMoment;
    const envBeginDate = process.env.STATUS_CHANGED_FROM_BACKLOG_FROM_DATE_YMD;

    if (!isScheduled && envBeginDate) {
      beginMoment = moment(envBeginDate);
    } else {
      beginMoment = endMoment.clone().subtract(count, unitOfTime);
    }

    return {
      dateBegin: this.reformatDateFromISOToYMD(beginMoment),
      dateEnd: this.reformatDateFromISOToYMD(endMoment),
    };
  }

  static checkDatesSequence(dateBegin, dateEnd) {
    if (moment(dateEnd).isBefore(dateBegin)) {
      throw new Error(`[err]   end date ${dateEnd} cannot be before start date ${dateBegin}!`);
    }
  }

  static getMonthName(dateBegin) {
    moment.locale('ru');

    return moment(dateBegin, JSONLoader.config.datesFormatYMD)
      .format(JSONLoader.config.datesFormatMonthName);
  }

  static getYear(dateBegin) {
    return moment(dateBegin, JSONLoader.config.datesFormatDMY).year();
  }

  static getMonths() {
    moment.locale('ru');

    return moment.months();
  }

  static sortByTimestamps(changelog) {
    return changelog.sort((a, b) => this.convertTimestampToDateObject(a.created)
    - this.convertTimestampToDateObject(b.created));
  }

  static convertTimestampsToDateObjects(changelogItems) {
    changelogItems.forEach((changelogItem) => {
      changelogItem.created = this
        .convertTimestampToDateObject(changelogItem.created);
    });
  }

  static getTimeIntervals(changelogItems) {
    const timeIntervals = [];
    for (let i = 0; i < changelogItems.length - 1; i += 1) {
      timeIntervals.push([changelogItems[i], changelogItems[i + 1]]);
    }

    return timeIntervals;
  }

  static createInitialTimestamp(sortedChangelog) {
    return {
      transitionFrom: JSONLoader.config.initIssueStatus,
      created: this.convertTimestampToDateObject(sortedChangelog[0].created),
    };
  }
}

export default TimeUtils;
