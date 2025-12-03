const authValidators = require('./auth.validator');
const courseValidators = require('./course.validator');
const userValidators = require('./user.validator');
const paymentValidators = require('./payment.validator');
const promotionValidators = require('./promotion.validator');

module.exports = {
  authValidators,
  courseValidators,
  userValidators,
  paymentValidators,
  promotionValidators
};