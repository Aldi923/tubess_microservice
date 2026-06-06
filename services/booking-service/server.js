const express = require('express');
const cors = require('cors');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const sequelize = require('./config/database');
const Booking = require('./models/Booking');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Service internal URLs (Docker internal communication)
const DESTINATION_SERVICE_URL = process.env.DESTINATION_SERVICE_INTERNAL_URL || 'http://localhost:3003';
const USER_SERVICE_URL = process.env.USER_SERVICE_INTERNAL_URL || 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_INTERNAL_URL || 'http://localhost:5002';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_INTERNAL_URL || 'http://localhost:3005';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Booking Service API',
      version: '1.1.0',
      description: 'Booking Service with Midtrans Integration and Inter-service communication via Axios',
    },
    servers: [
      {
        url: 'http://localhost:3000/bookings',
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
 * /:
 *   post:
 *     summary: Create a booking and trigger payment transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinationId
 *               - totalPerson
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               destinationId:
 *                 type: integer
 *                 example: 1
 *               totalPerson:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Booking created successfully, payment link returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookingId:
 *                   type: integer
 *                 totalPrice:
 *                   type: number
 *                 paymentUrl:
 *                   type: string
 */
app.post('/', async (req, res) => {
  try {
    let { userId, destinationId, totalPerson } = req.body;

    // Use header user ID if not provided in body (Gateway sets this)
    if (!userId && req.headers['x-user-id']) {
      userId = parseInt(req.headers['x-user-id']);
    }

    if (!userId || !destinationId || !totalPerson) {
      return res.status(400).json({ message: 'userId, destinationId, and totalPerson are required' });
    }

    // 1. Fetch Destination details from Destination Service
    let destination;
    try {
      const destResponse = await axios.get(`${DESTINATION_SERVICE_URL}/${destinationId}`);
      destination = destResponse.data;
    } catch (err) {
      return res.status(404).json({
        message: 'Failed to retrieve destination details',
        error: err.response ? err.response.data : err.message
      });
    }

    // 2. Fetch User details from User Service
    let userEmail = 'user@mail.com'; // Fallback
    let userName = 'Customer';       // Fallback
    try {
      const userResponse = await axios.get(`${USER_SERVICE_URL}/${userId}`);
      if (userResponse.data) {
        userEmail = userResponse.data.email || userEmail;
        userName = userResponse.data.name || userName;
      }
    } catch (err) {
      console.warn(`Could not verify user details with User Service: ${err.message}. Using default details.`);
    }

    // 3. Calculate price
    const totalPrice = totalPerson * parseFloat(destination.price);

    // 4. Save Booking
    const booking = await Booking.create({
      userId,
      destinationId,
      totalPerson,
      totalPrice
    });

    // 5. Call Payment Service to create Midtrans transaction
    let paymentUrl = '';
    try {
      const paymentResponse = await axios.post(`${PAYMENT_SERVICE_URL}/create`, {
        bookingId: booking.id,
        amount: totalPrice,
        customerName: userName,
        customerEmail: userEmail
      });
      if (paymentResponse.data && paymentResponse.data.redirect_url) {
        paymentUrl = paymentResponse.data.redirect_url;
      }
    } catch (err) {
      console.error('Failed to create Midtrans transaction via Payment Service:', err.response ? err.response.data : err.message);
    }

    // 6. Send Notification async (fire-and-forget or try-catch block)
    try {
      await axios.post(`${NOTIFICATION_SERVICE_URL}/notifications/email`, {
        to: userEmail,
        subject: `Booking Success - ${destination.name}`
      });
    } catch (err) {
      console.error('Failed to send email notification:', err.message);
    }

    // Response matching exactly the new format
    res.status(201).json({
      bookingId: booking.id,
      totalPrice: booking.totalPrice,
      paymentUrl: paymentUrl
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get all bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 */
app.get('/', async (req, res) => {
  try {
    const bookings = await Booking.findAll();
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Get booking by ID
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
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
app.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Delete booking
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
 *         description: Booking deleted successfully
 *       404:
 *         description: Booking not found
 */
app.delete('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await booking.destroy();
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Sync Database & Start Server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    app.listen(PORT, () => {
      console.log(`Booking Service is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
