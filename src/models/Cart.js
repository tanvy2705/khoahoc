const { query, queryOne } = require('../config/database');

class Cart {
  // Get user cart
  static async getUserCart(userId) {
    const rows = await query(
      `SELECT c.id,
              c.user_id,
              c.course_id,
              c.added_at,
              co.id as course_id,
              co.title,
              co.description,
              co.thumbnail,
              co.price,
              co.discount_price,
              cat.name as category_name
       FROM cart c
       JOIN courses co ON c.course_id = co.id
       LEFT JOIN categories cat ON co.category_id = cat.id
       WHERE c.user_id = ?
       ORDER BY c.added_at DESC`,
      [userId]
    );

    // ✅ Transform flat structure to nested structure
    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      course_id: row.course_id,
      added_at: row.added_at,
      course: {
        id: row.course_id,
        title: row.title,
        description: row.description,
        thumbnail: row.thumbnail,
        price: row.price,
        discount_price: row.discount_price,
        category_name: row.category_name
      }
    }));
  }

  // Add to cart
  static async addItem(userId, courseId) {
    // Check if already in cart
    const existing = await queryOne(
      'SELECT * FROM cart WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    
    if (existing) {
      throw new Error('Course already in cart');
    }
    
    // Check if already enrolled
    const enrolled = await queryOne(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    
    if (enrolled) {
      throw new Error('Already enrolled in this course');
    }
    
    const result = await query(
      'INSERT INTO cart (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );
    
    return result.insertId;
  }

  // Remove from cart
  static async removeItem(userId, itemId) {
    await query(
      'DELETE FROM cart WHERE id = ? AND user_id = ?',
      [itemId, userId]
    );
  }

  // Clear cart
  static async clear(userId) {
    await query('DELETE FROM cart WHERE user_id = ?', [userId]);
  }

  // Get cart count
  static async getCount(userId) {
    const result = await queryOne(
      'SELECT COUNT(*) as count FROM cart WHERE user_id = ?',
      [userId]
    );
    return result.count;
  }

  // Get cart total
  static async getTotal(userId) {
    const result = await queryOne(
      `SELECT SUM(COALESCE(co.discount_price, co.price)) as total
       FROM cart c
       JOIN courses co ON c.course_id = co.id
       WHERE c.user_id = ?`,
      [userId]
    );
    return parseFloat(result.total || 0);
  }
}

module.exports = Cart;