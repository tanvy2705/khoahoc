const { query, queryOne } = require('../config/database');

class Category {
  // Get all categories
  static async getAll(filters = {}) {
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY name ASC';
    
    return await query(sql, params);
  }

  // Find by ID
  static async findById(id) {
    return await queryOne(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
  }

  // Find by slug
  static async findBySlug(slug) {
    return await queryOne(
      'SELECT * FROM categories WHERE slug = ?',
      [slug]
    );
  }

  // Create category
  static async create(categoryData) {
    const result = await query(
      'INSERT INTO categories (name, slug, description, icon, status) VALUES (?, ?, ?, ?, ?)',
      [
        categoryData.name,
        categoryData.slug,
        categoryData.description,
        categoryData.icon,
        categoryData.status || 'active'
      ]
    );
    
    return result.insertId;
  }

  // Update category
  static async update(id, categoryData) {
    const fields = [];
    const values = [];
    
    const allowedFields = ['name', 'slug', 'description', 'icon', 'status'];
    
    allowedFields.forEach(field => {
      if (categoryData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(categoryData[field]);
      }
    });
    
    if (fields.length === 0) return null;
    
    values.push(id);
    
    await query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await this.findById(id);
  }

  // Delete category
  static async delete(id) {
    await query('DELETE FROM categories WHERE id = ?', [id]);
  }

  // Get category with course count
  static async getCategoriesWithCourseCount() {
    return await query(
      `SELECT c.*, COUNT(co.id) as course_count
       FROM categories c
       LEFT JOIN courses co ON c.id = co.category_id AND co.status = 'active'
       WHERE c.status = 'active'
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
  }
}

module.exports = Category;
