const { query, queryOne } = require('../config/database');

class Course {
  // Get all courses
  static async getAll(filters = {}) {
    let sql = `
      SELECT c.*, 
             cat.name as category_name,
             u.full_name as instructor_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.status) {
      sql += ' AND c.status = ?';
      params.push(filters.status);
    }
    
    if (filters.category_id) {
      sql += ' AND c.category_id = ?';
      params.push(filters.category_id);
    }
    
    if (filters.featured) {
      sql += ' AND c.featured = TRUE';
    }
    
    if (filters.search) {
      sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    sql += ' ORDER BY c.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Get course by ID
  static async findById(id) {
    return await queryOne(
      `SELECT c.*, 
              cat.name as category_name,
              u.full_name as instructor_name,
              u.email as instructor_email
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.id = ?`,
      [id]
    );
  }

  // Get course by slug
  static async findBySlug(slug) {
    return await queryOne(
      `SELECT c.*, 
              cat.name as category_name,
              u.full_name as instructor_name
       FROM courses c
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.slug = ?`,
      [slug]
    );
  }

  // Create course
  static async create(courseData) {
    const result = await query(
      `INSERT INTO courses (title, slug, description, thumbnail, category_id, 
                            instructor_id, price, discount_price, level, duration, 
                            language, status, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseData.title,
        courseData.slug,
        courseData.description,
        courseData.thumbnail,
        courseData.category_id,
        courseData.instructor_id,
        courseData.price,
        courseData.discount_price,
        courseData.level,
        courseData.duration,
        courseData.language || 'vi',
        courseData.status || 'draft',
        courseData.featured || false
      ]
    );
    
    return result.insertId;
  }

  // Update course
  static async update(id, courseData) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'title', 'slug', 'description', 'thumbnail', 'category_id',
      'price', 'discount_price', 'level', 'duration', 'language',
      'status', 'featured'
    ];
    
    allowedFields.forEach(field => {
      if (courseData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(courseData[field]);
      }
    });
    
    values.push(id);
    
    await query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await this.findById(id);
  }

  // Delete course
  static async delete(id) {
    await query('DELETE FROM courses WHERE id = ?', [id]);
  }

  // Get course lessons
  static async getLessons(courseId) {
    return await query(
      `SELECT * FROM lessons 
       WHERE course_id = ? AND status = 'active'
       ORDER BY order_index ASC`,
      [courseId]
    );
  }

  // Count courses
  static async count(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM courses WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.category_id) {
      sql += ' AND category_id = ?';
      params.push(filters.category_id);
    }
    
    const result = await queryOne(sql, params);
    return result.total;
  }

  // Get categories
  static async getCategories() {
    return await query(
      'SELECT * FROM categories WHERE status = "active" ORDER BY name ASC'
    );
  }

  // Update student count
  static async updateStudentCount(courseId) {
    await query(
      `UPDATE courses 
       SET total_students = (
         SELECT COUNT(*) FROM enrollments WHERE course_id = ? AND status != 'cancelled'
       )
       WHERE id = ?`,
      [courseId, courseId]
    );
  }
}

module.exports = Course;