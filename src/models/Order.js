const { query, queryOne, transaction } = require('../config/database');
const Helpers = require('../utils/helpers');

class Order {
  // Create order
  static async create(orderData) {
    return await transaction(async (connection) => {
      // Generate order code
      const orderCode = Helpers.generateOrderCode();
      
      // Insert order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (order_code, user_id, total_amount, discount_amount, 
                             final_amount, promotion_id, payment_method, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderCode,
          orderData.user_id,
          orderData.total_amount,
          orderData.discount_amount || 0,
          orderData.final_amount,
          orderData.promotion_id || null,
          orderData.payment_method,
          'pending'
        ]
      );
      
      const orderId = orderResult.insertId;
      
      // Insert order items
      if (orderData.items && orderData.items.length > 0) {
        const itemValues = orderData.items.map(item => [
          orderId,
          item.course_id,
          item.price,
          item.discount_price
        ]);
        
        await connection.query(
          `INSERT INTO order_items (order_id, course_id, price, discount_price)
           VALUES ?`,
          [itemValues]
        );
      }
      
      return { orderId, orderCode };
    });
  }

  // Get order by ID
  static async findById(orderId) {
    return await queryOne(
      `SELECT o.*, 
              u.full_name as customer_name,
              u.email as customer_email,
              p.code as promotion_code
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN promotions p ON o.promotion_id = p.id
       WHERE o.id = ?`,
      [orderId]
    );
  }

  // Get order by code
  static async findByCode(orderCode) {
    return await queryOne(
      `SELECT o.*, 
              u.full_name as customer_name,
              u.email as customer_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.order_code = ?`,
      [orderCode]
    );
  }

  // Get order items
  static async getItems(orderId) {
    return await query(
      `SELECT oi.*, 
              c.title as course_title,
              c.thumbnail
       FROM order_items oi
       JOIN courses c ON oi.course_id = c.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
  }

  // Get user orders
  static async getUserOrders(userId, filters = {}) {
    let sql = `
      SELECT o.*, 
             COUNT(oi.id) as total_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
    `;
    const params = [userId];
    
    if (filters.status) {
      sql += ' AND o.status = ?';
      params.push(filters.status);
    }
    
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Get all orders (admin)
  static async getAll(filters = {}) {
    let sql = `
      SELECT o.*, 
             u.full_name as customer_name,
             u.email as customer_email,
             COUNT(oi.id) as total_items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.status) {
      sql += ' AND o.status = ?';
      params.push(filters.status);
    }
    
    if (filters.payment_status) {
      sql += ' AND o.payment_status = ?';
      params.push(filters.payment_status);
    }
    
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Update order status
  static async updateStatus(orderId, status) {
    await query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );
  }

  // Update payment status
  static async updatePaymentStatus(orderId, paymentStatus) {
    await query(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      [paymentStatus, orderId]
    );
  }

  // Count orders
  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const params = [];
    
    if (filters.user_id) {
      sql += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    const result = await queryOne(sql, params);
    return result.total;
  }
}

module.exports = Order;