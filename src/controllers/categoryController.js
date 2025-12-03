const Category = require('../models/Category');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const Helpers = require('../utils/helpers');

class CategoryController {
  // Get all categories
  getAllCategories = asyncHandler(async (req, res) => {
    const { status } = req.query;
    
    const categories = await Category.getAll({ status });
    
    return ResponseHandler.success(res, categories);
  });

  // Get categories with course count
  getCategoriesWithCourseCount = asyncHandler(async (req, res) => {
    const categories = await Category.getCategoriesWithCourseCount();
    return ResponseHandler.success(res, categories);
  });

  // Get category by ID
  getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    
    if (!category) {
      return ResponseHandler.notFound(res, 'Category not found');
    }
    
    return ResponseHandler.success(res, category);
  });

  // Create category (Admin)
  createCategory = asyncHandler(async (req, res) => {
    const { name, description, icon } = req.body;
    
    const slug = Helpers.slugify(name);
    
    // Check if slug exists
    const existing = await Category.findBySlug(slug);
    if (existing) {
      return ResponseHandler.conflict(res, 'Category with this name already exists');
    }
    
    const categoryId = await Category.create({
      name,
      slug,
      description,
      icon
    });
    
    const category = await Category.findById(categoryId);
    
    return ResponseHandler.created(res, category, 'Category created successfully');
  });

  // Update category (Admin)
  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return ResponseHandler.notFound(res, 'Category not found');
    }
    
    // Generate new slug if name changed
    let slug = category.slug;
    if (req.body.name && req.body.name !== category.name) {
      slug = Helpers.slugify(req.body.name);
    }
    
    const updatedCategory = await Category.update(id, {
      ...req.body,
      slug
    });
    
    return ResponseHandler.success(res, updatedCategory, 'Category updated successfully');
  });

  // Delete category (Admin)
  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return ResponseHandler.notFound(res, 'Category not found');
    }
    
    await Category.delete(id);
    
    return ResponseHandler.success(res, null, 'Category deleted successfully');
  });
}

module.exports = new CategoryController();