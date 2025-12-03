const { query, queryOne } = require('../config/database');

class LessonProgress {
  // Get progress for enrollment
  static async getByEnrollmentId(enrollmentId) {
    return await query(
      `SELECT lp.*, l.title as lesson_title, l.order_index
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       WHERE lp.enrollment_id = ?
       ORDER BY l.order_index ASC`,
      [enrollmentId]
    );
  }

  // Find specific progress
  static async findByEnrollmentAndLesson(enrollmentId, lessonId) {
    return await queryOne(
      'SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
      [enrollmentId, lessonId]
    );
  }

  // Create or update progress
  static async upsert(enrollmentId, lessonId, progressData) {
    const existing = await this.findByEnrollmentAndLesson(enrollmentId, lessonId);
    
    if (existing) {
      await query(
        `UPDATE lesson_progress 
         SET completed = ?, completed_at = ?, watch_time = ?, last_position = ?
         WHERE enrollment_id = ? AND lesson_id = ?`,
        [
          progressData.completed,
          progressData.completed ? new Date() : existing.completed_at,
          progressData.watch_time || existing.watch_time,
          progressData.last_position || existing.last_position,
          enrollmentId,
          lessonId
        ]
      );
    } else {
      await query(
        `INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, 
                                       completed_at, watch_time, last_position)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          enrollmentId,
          lessonId,
          progressData.completed,
          progressData.completed ? new Date() : null,
          progressData.watch_time || 0,
          progressData.last_position || 0
        ]
      );
    }
  }

  // Mark as complete
  static async markComplete(enrollmentId, lessonId) {
    await this.upsert(enrollmentId, lessonId, { completed: true });
  }

  // Update watch time
  static async updateWatchTime(enrollmentId, lessonId, watchTime, lastPosition) {
    await this.upsert(enrollmentId, lessonId, {
      completed: false,
      watch_time: watchTime,
      last_position: lastPosition
    });
  }

  // Get completion statistics
  static async getCompletionStats(enrollmentId) {
    return await queryOne(
      `SELECT 
         COUNT(*) as total_lessons,
         SUM(CASE WHEN lp.completed THEN 1 ELSE 0 END) as completed_lessons,
         ROUND(SUM(CASE WHEN lp.completed THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_percentage
       FROM lesson_progress lp
       WHERE lp.enrollment_id = ?`,
      [enrollmentId]
    );
  }
}

module.exports = LessonProgress;