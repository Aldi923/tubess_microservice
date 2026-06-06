const express = require('express');
const cors = require('cors');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const sequelize = require('./config/database');
const Payment = require('./models/Payment');
const snap = require('./config/midtrans');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_INTERNAL_URL || 'http://localhost:5002';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Service API',
      version: '1.1.0',
      description: 'Payment Service integrating Midtrans Snap API and Webhook Callbacks',
    },
    servers: [
      {
        url: 'http://localhost:3000/payments',
        description: 'Through API Gateway'
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Direct Service'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    }
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /create:
 *   post:
 *     summary: Create Midtrans Snap Token & Payment transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - amount
 *               - customerName
 *               - customerEmail
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 example: 1
 *               amount:
 *                 type: number
 *                 example: 3000000
 *               customerName:
 *                 type: string
 *                 example: "Aldi"
 *               customerEmail:
 *                 type: string
 *                 example: "aldi@test.com"
 *     responses:
 *       201:
 *         description: Midtrans Snap Token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 redirect_url:
 *                   type: string
 */
app.post('/create', async (req, res) => {
  try {
    const { bookingId, amount, customerName, customerEmail } = req.body;
    if (!bookingId || !amount || !customerName || !customerEmail) {
      return res.status(400).json({ message: 'bookingId, amount, customerName, and customerEmail are required' });
    }

    const orderId = `BOOKING-${bookingId}-${Date.now()}`;

    // Midtrans Snap API Parameters
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: customerName,
        email: customerEmail
      },
      credit_card: {
        secure: true
      }
    };

    // 1. Create Snap transaction
    const transaction = await snap.createTransaction(parameter);

    // 2. Save payment state in local database as PENDING
    await Payment.create({
      bookingId,
      transactionId: orderId, // Store unique orderId first, update to Midtrans transaction ID on callback
      grossAmount: amount,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during payment creation', error: error.message });
  }
});

/**
 * @swagger
 * /callback:
 *   post:
 *     summary: Midtrans Payment Status Callback Webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Callback processed successfully
 */
app.post('/callback', async (req, res) => {
  try {
    const notificationJson = req.body;

    // Validate and process the notification using Midtrans SDK
    const statusResponse = await snap.transaction.notification(notificationJson);

    const orderId = statusResponse.order_id;
    const transactionId = statusResponse.transaction_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    const paymentType = statusResponse.payment_type;

    // Extract booking ID from order ID (BOOKING-<bookingId>-<timestamp>)
    const bookingId = orderId.split('-')[1];

    let mappedStatus = 'PENDING';

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        mappedStatus = 'PENDING';
      } else if (fraudStatus === 'accept') {
        mappedStatus = 'PAID';
      }
    } else if (transactionStatus === 'settlement') {
      mappedStatus = 'PAID';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
      mappedStatus = 'FAILED';
    } else if (transactionStatus === 'expire') {
      mappedStatus = 'EXPIRED';
    } else if (transactionStatus === 'pending') {
      mappedStatus = 'PENDING';
    }

    // Update the payment record in the database
    const payment = await Payment.findOne({ where: { transactionId: orderId } });
    if (payment) {
      payment.status = mappedStatus;
      payment.paymentType = paymentType;
      payment.transactionId = transactionId; // Save official Midtrans transaction ID
      await payment.save();

      // Trigger notification service
      try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/notifications/email`, {
          to: 'user@mail.com', // fallback or lookup user
          subject: `Payment status: ${mappedStatus} for Booking #${bookingId}`
        });
      } catch (err) {
        console.error('Failed to send callback notification email:', err.message);
      }

      console.log(`Payment for Booking #${bookingId} updated to ${mappedStatus}`);
      return res.status(200).json({ success: true, message: `Payment updated to ${mappedStatus}` });
    }

    res.status(404).json({ success: false, message: 'Payment record not found' });
  } catch (error) {
    res.status(500).json({ message: 'Callback processing error', error: error.message });
  }
});

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Get payment details by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 */
app.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Sync Database & Start Server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    app.listen(PORT, () => {
      console.log(`Payment Service is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
