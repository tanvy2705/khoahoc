
const { query, queryOne } = require('../config/database');

class Enrollment {
  // Create enrollment
  static async create(userId, courseId) {
    // Check if already enrolled
    const existing = await queryOne(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    
    if (existing) {
      throw new Error('Already enrolled in this course');
    }
    
    const result = await query(
      'INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, ?)',
      [userId, courseId, 'active']
    );
    
    return result.insertId;
  }

  // Get user enrollments
  static async getUserEnrollments(userId, filters = {}) {
    let sql = `
      SELECT e.*, 
             c.title as course_title,
             c.thumbnail,
             c.total_lessons,
             cat.name as category_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE e.user_id = ?
    `;
    const params = [userId];
    
    if (filters.status) {
      sql += ' AND e.status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY e.enrollment_date DESC';
    
    return await query(sql, params);
  }

  // Get enrollment by ID
  static async findById(enrollmentId) {
    return await queryOne(
      `SELECT e.*, 
              c.title as course_title,
              c.total_lessons,
              u.full_name as student_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [enrollmentId]
    );
  }

  // Check if user is enrolled
  static async isEnrolled(userId, courseId) {
    const result = await queryOne(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
      [userId, courseId]
    );
    return !!result;
  }

  // Get course progress
  static async getProgress(enrollmentId) {
    return await query(
      `SELECT lp.*, l.title as lesson_title, l.order_index
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       WHERE lp.enrollment_id = ?
       ORDER BY l.order_index ASC`,
      [enrollmentId]
    );
  }

  // Update lesson progress
  static async updateLessonProgress(enrollmentId, lessonId, completed = true) {
    // Insert or update progress
    await query(
      `INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, completed_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         completed = VALUES(completed),
         completed_at = VALUES(completed_at)`,
      [enrollmentId, lessonId, completed, completed ? new Date() : null]
    );
    
    // Recalculate overall progress
    await this.recalculateProgress(enrollmentId);
  }

  // Recalculate enrollment progress
  static async recalculateProgress(enrollmentId) {
    const enrollment = await queryOne(
      'SELECT course_id FROM enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    if (!enrollment) return;
    
    // Get total lessons
    const totalResult = await queryOne(
      'SELECT COUNT(*) as total FROM lessons WHERE course_id = ? AND status = "active"',
      [enrollment.course_id]
    );
    
    // Get completed lessons
    const completedResult = await queryOne(
      `SELECT COUNT(*) as completed 
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       WHERE lp.enrollment_id = ? AND lp.completed = TRUE AND l.course_id = ?`,
      [enrollmentId, enrollment.course_id]
    );
    
    const progress = (completedResult.completed / totalResult.total) * 100;
    const status = progress >= 100 ? 'completed' : 'active';
    
    await query(
      `UPDATE enrollments 
       SET progress = ?, status = ?, completion_date = ?, last_accessed = NOW()
       WHERE id = ?`,
      [progress.toFixed(2), status, progress >= 100 ? new Date() : null, enrollmentId]
    );
    
    return progress;
  }

  // Get all enrollments (admin/staff)
  static async getAll(filters = {}) {
    let sql = `
      SELECT e.*, 
             c.title as course_title,
             u.full_name as student_name,
             u.email as student_email
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.course_id) {
      sql += ' AND e.course_id = ?';
      params.push(filters.course_id);
    }
    
    if (filters.status) {
      sql += ' AND e.status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY e.enrollment_date DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }
}

module.exports = Enrollment;