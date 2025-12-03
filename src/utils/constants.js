module.exports = {
  ROLES: {
    ADMIN: 1,
    STAFF: 2,
    USER: 3
  },

  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BANNED: 'banned'
  },

  COURSE_STATUS: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    INACTIVE: 'inactive'
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled'
  },

  PAYMENT_STATUS: {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  PAYMENT_METHODS: {
    MOMO: 'momo',
    MANUAL_TRANSFER: 'manual_transfer',
    VNPAY: 'vnpay',
    PAYPAL: 'paypal'
  },

  NOTIFICATION_TYPES: {
    SYSTEM: 'system',
    PAYMENT: 'payment',
    COURSE: 'course',
    SUPPORT: 'support',
    PROMOTION: 'promotion'
  },

  NOTIFICATION_STATUS: {
    UNREAD: 'unread',
    READ: 'read'
  },

  ENROLLMENT_STATUS: {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  PROMOTION_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    EXPIRED: 'expired'
  },

  DISCOUNT_TYPES: {
    PERCENTAGE: 'percentage',
    FIXED: 'fixed'
  }
};
