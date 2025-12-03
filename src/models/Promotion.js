
const { query, queryOne } = require('../config/database');

class Promotion {
  // Create promotion
  static async create(promotionData) {
    const result = await query(
      `INSERT INTO promotions (code, name, description, discount_type, discount_value,
                               max_discount, min_order_value, usage_limit, user_usage_limit,
                               start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        promotionData.code,
        promotionData.name,
        promotionData.description,
        promotionData.discount_type,
        promotionData.discount_value,
        promotionData.max_discount || null,
        promotionData.min_order_value || 0,
        promotionData.usage_limit || null,
        promotionData.user_usage_limit || 1,
        promotionData.start_date,
        promotionData.end_date,
        promotionData.status || 'active',
        promotionData.created_by
      ]
    );
    
    return result.insertId;
  }

  // Find by code
  static async findByCode(code) {
    return await queryOne(
      'SELECT * FROM promotions WHERE code = ?',
      [code]
    );
  }

  // Find by ID
  static async findById(id) {
    return await queryOne(
      'SELECT * FROM promotions WHERE id = ?',
      [id]
    );
  }

  // Get all promotions
  static async getAll(filters = {}) {
    let sql = 'SELECT * FROM promotions WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Get active promotions
  static async getActive() {
    return await query(
      `SELECT * FROM promotions 
       WHERE status = 'active' 
       AND start_date <= NOW() 
       AND end_date >= NOW()
       AND (usage_limit IS NULL OR usage_count < usage_limit)
       ORDER BY created_at DESC`
    );
  }

  // Validate promotion
  static async validate(code, userId, orderAmount) {
    const promotion = await this.findByCode(code);
    
    if (!promotion) {
      throw new Error('Promotion code not found');
    }
    
    // Check status
    if (promotion.status !== 'active') {
      throw new Error('Promotion code is not active');
    }
    
    // Check dates
    const now = new Date();
    if (new Date(promotion.start_date) > now || new Date(promotion.end_date) < now) {
      throw new Error('Promotion code has expired');
    }
    
    // Check usage limit
    if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
      throw new Error('Promotion code usage limit reached');
    }
    
    // Check min order value
    if (orderAmount < promotion.min_order_value) {
      throw new Error(`Minimum order value is ${promotion.min_order_value}`);
    }
    
    // Check user usage
    const userUsage = await queryOne(
      'SELECT COUNT(*) as count FROM promotion_usage WHERE promotion_id = ? AND user_id = ?',
      [promotion.id, userId]
    );
    
    if (userUsage.count >= promotion.user_usage_limit) {
      throw new Error('You have reached the usage limit for this promotion');
    }
    
    return promotion;
  }

  // Calculate discount
  static calculateDiscount(promotion, orderAmount) {
    let discount = 0;
    
    if (promotion.discount_type === 'percentage') {
      discount = (orderAmount * promotion.discount_value) / 100;
      if (promotion.max_discount && discount > promotion.max_discount) {
        discount = promotion.max_discount;
      }
    } else {
      discount = promotion.discount_value;
    }
    
    return parseFloat(discount.toFixed(2));
  }

  // Record usage
  static async recordUsage(promotionId, userId, orderId, discountAmount) {
    await query(
      'INSERT INTO promotion_usage (promotion_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)',
      [promotionId, userId, orderId, discountAmount]
    );
  }

  // Update promotion
  static async update(id, promotionData) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'name', 'description', 'discount_type', 'discount_value',
      'max_discount', 'min_order_value', 'usage_limit', 'user_usage_limit',
      'start_date', 'end_date', 'status'
    ];
    
    allowedFields.forEach(field => {
      if (promotionData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(promotionData[field]);
      }
    });
    
    values.push(id);
    
    await query(
      `UPDATE promotions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Delete promotion
  static async delete(id) {
    await query('DELETE FROM promotions WHERE id = ?', [id]);
  }

  // Get promotion stats
  static async getStats(promotionId) {
    return await queryOne(
      `SELECT 
         p.*,
         COUNT(pu.id) as total_uses,
         SUM(pu.discount_amount) as total_discount,
         COUNT(DISTINCT pu.user_id) as unique_users
       FROM promotions p
       LEFT JOIN promotion_usage pu ON p.id = pu.promotion_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [promotionId]
    );
  }
}

module.exports = Promotion;