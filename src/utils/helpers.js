const crypto = require('crypto');

class Helpers {
  // Generate random string
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate order code
  static generateOrderCode() {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${timestamp}${random}`;
  }

  // Calculate pagination
  static getPagination(page = 1, limit = 10) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    return {
      page: pageNum,
      limit: limitNum,
      offset
    };
  }

  // Format price
  static formatPrice(price) {
    return parseFloat(price).toFixed(2);
  }

  // Calculate discount
  static calculateDiscount(originalPrice, discountPrice) {
    if (!discountPrice || discountPrice >= originalPrice) return 0;
    return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
  }

  // Slugify string
  static slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  // Validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone
  static isValidPhone(phone) {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone);
  }

  // Format date
  static formatDate(date) {
    return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
  }

  // Check if date is expired
  static isExpired(date) {
    return new Date(date) < new Date();
  }

  // Generate verification token
  static generateVerificationToken() {
    return this.generateRandomString(32);
  }

  // Clean object (remove null/undefined)
  static cleanObject(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null)
    );
  }
}

module.exports = Helpers;