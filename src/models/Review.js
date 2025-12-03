const { query, queryOne } = require('../config/database');

class Review {
  // Create review
  static async create(reviewData) {
    const result = await query(
      'INSERT INTO reviews (course_id, user_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)',
      [
        reviewData.course_id,
        reviewData.user_id,
        reviewData.rating,
        reviewData.comment,
        reviewData.status || 'pending'
      ]
    );
    
    return result.insertId;
  }

  // Get reviews by course
  static async getByCourseId(courseId, filters = {}) {
    let sql = `
      SELECT r.*, u.full_name as user_name, u.avatar
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.course_id = ?
    `;
    const params = [courseId];
    
    if (filters.status) {
      sql += ' AND r.status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY r.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Get user review for course
  static async getUserReview(userId, courseId) {
    return await queryOne(
      'SELECT * FROM reviews WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
  }

  // Update review
  static async update(id, reviewData) {
    const fields = [];
    const values = [];
    
    ['rating', 'comment', 'status'].forEach(field => {
      if (reviewData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(reviewData[field]);
      }
    });
    
    if (fields.length === 0) return null;
    
    values.push(id);
    
    await query(
      `UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await queryOne('SELECT * FROM reviews WHERE id = ?', [id]);
  }

  // Delete review
  static async delete(id) {
    await query('DELETE FROM reviews WHERE id = ?', [id]);
  }

  // Get course rating statistics
  static async getCourseRatingStats(courseId) {
    return await queryOne(
      `SELECT 
         COUNT(*) as total_reviews,
         AVG(rating) as average_rating,
         SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
         SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
         SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
         SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
         SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
       FROM reviews
       WHERE course_id = ? AND status = 'approved'`,
      [courseId]
    );
  }
}

module.exports = Review;