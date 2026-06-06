const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Logging Middleware
app.use(morgan('dev'));

// Configurable routes mapping
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  destination: process.env.DESTINATION_SERVICE_URL || 'http://localhost:3003',
  booking: process.env.BOOKING_SERVICE_URL || 'http://localhost:3004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5001',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5002',
};

// JWT verification middleware for gateway
const authenticateToken = (req, res, next) => {
  // Allow login and register to bypass
  if (
    (req.path === '/auth/login' || req.path === '/auth/register' || req.path.startsWith('/auth/api-docs')) ||
    (req.method === 'GET' && req.path.startsWith('/destinations')) ||
    req.path.endsWith('/api-docs')
  ) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Token Required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or Expired Token' });
    }
    req.user = user;
    next();
  });
};

// Apply auth middleware to all paths except the public ones inside it
app.use(authenticateToken);

// Setup Proxy for each Service
const createProxy = (pathFilter, targetUrl) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: {
      // Keep path as is, but if we need to trim/rewrite we can do it here.
      // Since gateway exposes `/auth/login` and auth-service exposes `/login`, we rewrite `/auth` to `/`
      [`^${pathFilter}`]: '',
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Inject authenticated user headers if available
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.id || '');
          proxyReq.setHeader('x-user-email', req.user.email || '');
          proxyReq.setHeader('x-user-name', req.user.name || '');
        }
      }
    }
  });
};

// Routes definition
app.use('/auth', createProxy('/auth', services.auth));
app.use('/users', createProxy('/users', services.user));
app.use('/destinations', createProxy('/destinations', services.destination));
app.use('/bookings', createProxy('/bookings', services.booking));
app.use('/payments', createProxy('/payments', services.payment));
app.use('/recommendations', createProxy('/recommendations', services.recommendation));
app.use('/notifications', createProxy('/notifications', services.notification));

// Default Fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Service/Route Not Found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Gateway Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
});
