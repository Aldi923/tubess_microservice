const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'booking_id'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transaction_id'
  },
  grossAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'gross_amount'
  },
  paymentType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_type'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED'),
    defaultValue: 'PENDING'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Payment;
