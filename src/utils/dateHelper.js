const moment = require('moment');

class DateHelper {
  // Format date to Vietnamese format
  static formatDate(date, format = 'DD/MM/YYYY') {
    return moment(date).format(format);
  }

  // Format datetime
  static formatDateTime(date, format = 'DD/MM/YYYY HH:mm') {
    return moment(date).format(format);
  }

  // Get relative time (e.g., "2 hours ago")
  static getRelativeTime(date) {
    return moment(date).fromNow();
  }

  // Check if date is expired
  static isExpired(date) {
    return moment(date).isBefore(moment());
  }

  // Check if date is in range
  static isInRange(date, startDate, endDate) {
    return moment(date).isBetween(startDate, endDate, null, '[]');
  }

  // Add days to date
  static addDays(date, days) {
    return moment(date).add(days, 'days').toDate();
  }

  // Add hours to date
  static addHours(date, hours) {
    return moment(date).add(hours, 'hours').toDate();
  }

  // Get start of day
  static startOfDay(date) {
    return moment(date).startOf('day').toDate();
  }

  // Get end of day
  static endOfDay(date) {
    return moment(date).endOf('day').toDate();
  }

  // Get MySQL datetime format
  static toMySQLDateTime(date = new Date()) {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  }

  // Parse date
  static parse(dateString, format = 'YYYY-MM-DD') {
    return moment(dateString, format).toDate();
  }
}

module.exports = DateHelper;