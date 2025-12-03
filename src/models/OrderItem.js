const { query, queryOne } = require('../config/database');

class OrderItem {
  // Create order item
  static async create(orderItemData) {
    const result = await query(
      'INSERT INTO order_items (order_id, course_id, price, discount_price) VALUES (?, ?, ?, ?)',
      [
        orderItemData.order_id,
        orderItemData.course_id,
        orderItemData.price,
        orderItemData.discount_price
      ]
    );
    
    return result.insertId;
  }

  // Get items by order ID
  static async getByOrderId(orderId) {
    return await query(
      `SELECT oi.*, 
              c.title as course_title,
              c.thumbnail,
              cat.name as category_name
       FROM order_items oi
       JOIN courses c ON oi.course_id = c.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
  }

  // Find by ID
  static async findById(id) {
    return await queryOne(
      'SELECT * FROM order_items WHERE id = ?',
      [id]
    );
  }
}

module.exports = OrderItem;