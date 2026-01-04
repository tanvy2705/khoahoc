const { query, queryOne } = require('../config/database');

class Payment {
  // Create payment
  static async create(paymentData) {
    const result = await query(
      `INSERT INTO payments (order_id, transaction_code, payment_method, amount, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        paymentData.order_id,
        paymentData.transaction_code,
        paymentData.payment_method,
        paymentData.amount,
        paymentData.status || 'pending'
      ]
    );
    
    return result.insertId;
  }

  // Find by ID
  static async findById(paymentId) {
    return await queryOne(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );
  }

  // Find by transaction code
  static async findByTransactionCode(transactionCode) {
    return await queryOne(
      'SELECT * FROM payments WHERE transaction_code = ?',
      [transactionCode]
    );
  }

  // Find by order ID
  static async findByOrderId(orderId) {
    return await queryOne(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId]
    );
  }

  // Update payment status
  static async updateStatus(paymentId, status, paymentDate = null) {
    await query(
      'UPDATE payments SET status = ?, payment_date = ? WHERE id = ?',
      [status, paymentDate || new Date(), paymentId]
    );
  }

  // Save MoMo payment details
  static async saveMoMoDetails(paymentId, momoData) {
    await query(
      `UPDATE payments 
       SET momo_request_id = ?, momo_order_id = ?, momo_trans_id = ?,
           momo_result_code = ?, momo_message = ?, response_data = ?
       WHERE id = ?`,
      [
        momoData.requestId,
        momoData.orderId,
        momoData.transId,
        momoData.resultCode,
        momoData.message,
        JSON.stringify(momoData),
        paymentId
      ]
    );
  }

  // Save manual transfer details
  static async saveManualTransfer(paymentId, transferData) {
    await query(
      `UPDATE payments 
       SET transfer_phone = ?, transfer_name = ?, bill_image = ?
       WHERE id = ?`,
      [
        transferData.phone,
        transferData.name,
        transferData.bill_image,
        paymentId
      ]
    );
  }

  // Verify manual transfer
  static async verifyManualTransfer(paymentId, verifiedBy) {
    await query(
      `UPDATE payments 
       SET status = 'success', verified_by = ?, verified_at = NOW(), payment_date = NOW()
       WHERE id = ?`,
      [verifiedBy, paymentId]
    );
  }

  // Get user payment history
  static async getUserHistory(userId, filters = {}) {
    let sql = `
      SELECT p.*, o.order_code, o.final_amount
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.user_id = ?
    `;
    const params = [userId];
    
    if (filters.status) {
      sql += ' AND p.status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY p.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Get all payments (admin)
  static async getAll(filters = {}) {
    let sql = `
      SELECT p.*, 
             o.order_code,
             o.final_amount,
             u.full_name as customer_name,
             u.email as customer_email
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.status) {
      sql += ' AND p.status = ?';
      params.push(filters.status);
    }
    
    if (filters.payment_method) {
      sql += ' AND p.payment_method = ?';
      params.push(filters.payment_method);
    }
    
    sql += ' ORDER BY p.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }
    
    return await query(sql, params);
  }

  // Get pending manual transfers
  static async getPendingManualTransfers() {
    return await query(
      `SELECT p.*, 
              o.order_code,
              o.final_amount,
              u.full_name as customer_name,
              u.email as customer_email
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE p.payment_method = 'manual_transfer' 
       AND p.status = 'pending'
       AND p.bill_image IS NOT NULL
       ORDER BY p.created_at DESC`
    );
  }
}

module.exports = Payment;