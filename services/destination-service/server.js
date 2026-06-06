const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const sequelize = require('./config/database');
const Destination = require('./models/Destination');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Destination Service API',
      version: '1.0.0',
      description: 'Destination CRUD Service for Travel Wisata System',
    },
    servers: [
      {
        url: 'http://localhost:3000/destinations',
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
 *   get:
 *     summary: Get all destinations
 *     responses:
 *       200:
 *         description: A list of destinations
 */
app.get('/', async (req, res) => {
  try {
    const destinations = await Destination.findAll();
    res.status(200).json(destinations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Get destination by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Destination details
 *       404:
 *         description: Destination not found
 */
app.get('/:id', async (req, res) => {
  try {
    const destination = await Destination.findByPk(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }
    res.status(200).json(destination);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /:
 *   post:
 *     summary: Create a new destination
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - city
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Bali
 *               city:
 *                 type: string
 *                 example: Denpasar
 *               price:
 *                 type: number
 *                 example: 1500000
 *               description:
 *                 type: string
 *                 example: Wisata pantai
 *               image:
 *                 type: string
 *                 example: https://images.unsplash.com/photo-1537996194471-e657df975ab4
 *     responses:
 *       201:
 *         description: Destination created successfully
 */
app.post('/', async (req, res) => {
  try {
    const { name, city, price, description, image } = req.body;
    if (!name || !city || !price) {
      return res.status(400).json({ message: 'Name, city, and price are required' });
    }

    const destination = await Destination.create({ name, city, price, description, image });
    res.status(201).json(destination);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /{id}:
 *   put:
 *     summary: Update destination by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Bali Updated
 *               city:
 *                 type: string
 *                 example: Kuta
 *               price:
 *                 type: number
 *                 example: 1600000
 *               description:
 *                 type: string
 *                 example: Wisata pantai diperbarui
 *               image:
 *                 type: string
 *                 example: https://images.unsplash.com/photo-1537996194471-e657df975ab4
 *     responses:
 *       200:
 *         description: Destination updated successfully
 *       404:
 *         description: Destination not found
 */
app.put('/:id', async (req, res) => {
  try {
    const { name, city, price, description, image } = req.body;
    const destination = await Destination.findByPk(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    if (name) destination.name = name;
    if (city) destination.city = city;
    if (price) destination.price = price;
    if (description) destination.description = description;
    if (image) destination.image = image;

    await destination.save();
    res.status(200).json(destination);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Delete destination by ID
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
 *         description: Destination deleted successfully
 *       404:
 *         description: Destination not found
 */
app.delete('/:id', async (req, res) => {
  try {
    const destination = await Destination.findByPk(req.params.id);
    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }
    await destination.destroy();
    res.status(200).json({ message: 'Destination deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Sync Database & Start Server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected...');
    app.listen(PORT, () => {
      console.log(`Destination Service is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
