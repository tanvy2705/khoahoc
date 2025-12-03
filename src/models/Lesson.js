const { query, queryOne } = require('../config/database');

class Lesson {
  // Get all lessons for a course
  static async getByCourseId(courseId) {
    return await query(
      `SELECT * FROM lessons 
       WHERE course_id = ? AND status = 'active'
       ORDER BY order_index ASC`,
      [courseId]
    );
  }

  // Find by ID
  static async findById(id) {
    return await queryOne(
      'SELECT * FROM lessons WHERE id = ?',
      [id]
    );
  }

  // Create lesson
  static async create(lessonData) {
    const result = await query(
      `INSERT INTO lessons (course_id, title, description, video_url, 
                            video_duration, order_index, is_preview, content, 
                            resources, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lessonData.course_id,
        lessonData.title,
        lessonData.description,
        lessonData.video_url,
        lessonData.video_duration,
        lessonData.order_index,
        lessonData.is_preview || false,
        lessonData.content,
        lessonData.resources ? JSON.stringify(lessonData.resources) : null,
        lessonData.status || 'active'
      ]
    );
    
    return result.insertId;
  }

  // Update lesson
  static async update(id, lessonData) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'title', 'description', 'video_url', 'video_duration',
      'order_index', 'is_preview', 'content', 'resources', 'status'
    ];
    
    allowedFields.forEach(field => {
      if (lessonData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(
          field === 'resources' && typeof lessonData[field] === 'object'
            ? JSON.stringify(lessonData[field])
            : lessonData[field]
        );
      }
    });
    
    if (fields.length === 0) return null;
    
    values.push(id);
    
    await query(
      `UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await this.findById(id);
  }

  // Delete lesson
  static async delete(id) {
    await query('DELETE FROM lessons WHERE id = ?', [id]);
  }

  // Reorder lessons
  static async reorder(courseId, lessonOrders) {
    const promises = lessonOrders.map(({ id, order_index }) =>
      query(
        'UPDATE lessons SET order_index = ? WHERE id = ? AND course_id = ?',
        [order_index, id, courseId]
      )
    );
    
    await Promise.all(promises);
  }

  // Get next lesson
  static async getNextLesson(courseId, currentOrderIndex) {
    return await queryOne(
      `SELECT * FROM lessons 
       WHERE course_id = ? AND order_index > ? AND status = 'active'
       ORDER BY order_index ASC
       LIMIT 1`,
      [courseId, currentOrderIndex]
    );
  }

  // Get previous lesson
  static async getPreviousLesson(courseId, currentOrderIndex) {
    return await queryOne(
      `SELECT * FROM lessons 
       WHERE course_id = ? AND order_index < ? AND status = 'active'
       ORDER BY order_index DESC
       LIMIT 1`,
      [courseId, currentOrderIndex]
    );
  }
}

module.exports = Lesson;