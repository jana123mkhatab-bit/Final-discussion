

require('dotenv').config();

const http = require('http');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
let MongoStore;
try {
  MongoStore = require('connect-mongo').default;
} catch (e) {
  console.warn('⚠️ connect-mongo not available, using memory store');
  MongoStore = null;
}
const { Server } = require('socket.io');
const User = require('./models/User');
const socketUtil = require('./utils/socket');
const ratingsRoutes = require('./routes/ratingsRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  console.log('━━━━━━━━━━ SESSION ENVIRONMENT AUDIT ━━━━━━━━━━');
  console.log('NODE_ENV       :', process.env.NODE_ENV);
  console.log('isProduction   :', isProduction);
  console.log('SESSION_SECRET :', process.env.SESSION_SECRET ? '✅ loaded' : '❌ MISSING – using fallback');
  console.log('MONGO_URI      :', process.env.MONGO_URI ? '✅ loaded' : '❌ MISSING');
  console.log('TRUST_PROXY    :', process.env.TRUST_PROXY || 'not set');
  console.log('cookie.secure  :', isProduction || process.env.TRUST_PROXY === 'true');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

let clientPromise;
if (process.env.NODE_ENV) {
  const bcrypt = require('bcryptjs');
  clientPromise = mongoose
    .connect(process.env.MONGO_URI)
    .then(async (m) => {
      console.log('✅ MongoDB Connected');
      await User.updateMany({}, { isOnline: false }).catch(err => console.error(err));

      const existing = await User.findOne({ email: 'sarah@example.com' });
      if (!existing) {
        await User.create({
          username: 'Sarah Jenkins',
          email: 'sarah@example.com',
          password: await bcrypt.hash('Test@1234', 10),
          role: 'admin'
        });
        console.log('✅ Admin user seeded');
      } else if (existing.role !== 'admin') {
        await User.findByIdAndUpdate(existing._id, { role: 'admin' });
        console.log('✅ Admin role updated');
      }

      return m.connection.getClient();
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      if (!process.env.VERCEL) process.exit(1);
    });
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/js', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const behindProxy = isProduction || process.env.TRUST_PROXY === 'true';
if (behindProxy) {
  app.set('trust proxy', 1);
  console.log('🔁 Trust proxy enabled');
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || (() => {
    if (isProduction) throw new Error('SESSION_SECRET must be set in production!');
    return 'fallback_dev_secret';
  })(),
  resave: false,
  saveUninitialized: false,
  store: (process.env.NODE_ENV && MongoStore)
    ? MongoStore.create({
      clientPromise: clientPromise,
      ttl: 60 * 60 * 24,
      collectionName: 'sessions'
    })
    : undefined,
  cookie: {
    secure: isProduction || process.env.TRUST_PROXY === 'true',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
});

app.use(sessionMiddleware);

if (!isProduction) {
  app.get('/debug-session', (req, res) => {
    res.json({
      sessionID: req.sessionID,
      session: req.session,
      isSecure: req.secure,
      protocol: req.protocol,
      trustProxy: app.get('trust proxy'),
      headers: {
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      }
    });
  });
}



app.use(async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId).select('-password');
      res.locals.currentUser = user || null;
    } else {
      res.locals.currentUser = null;
    }
    next();
  } catch (err) {
    res.locals.currentUser = null;
    next();
  }
});

const authRoutes = require('./routes/authRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const socialRoutes = require('./routes/socialRoutes');
const generalRoutes = require('./routes/generalRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

app.get('/', (req, res) => {
  res.render('index');
});

app.use('/media', mediaRoutes);
app.use('/', ratingsRoutes);
app.use('/', authRoutes);
app.use('/', marketplaceRoutes);
app.use('/', socialRoutes);
app.use('/admin', adminRoutes);
app.use('/', generalRoutes);

app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

app.use((err, req, res, next) => {
  const status = err.status || (err.name === 'CastError' ? 404 : 500);

  if (status >= 500) {
    console.error('🔥 Server Error:', err.stack || err.message);
  } else {
    console.warn(`⚠️ Client Error (${status}):`, err.message);
  }

  if (err.name === 'CastError') {
    return res.status(404).render('404', { url: req.originalUrl });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).render('error', {
      message: Object.values(err.errors).map(e => e.message).join(', '),
      status: 400
    });
  }

  res.status(status).render('error', {
    message: err.message || 'Server Error',
    status: status
  });
});

if (!process.env.VERCEL) {
  const io = new Server(server, {
    cors: { origin: false },
  });

  io.use((socket, next) => {
    const req = socket.request;


    const res = req.res || {
      getHeader: function () { return null; },
      setHeader: function () { },
      end: function () { },
      write: function () { },
      writeHead: function () { },
      on: function () { return this; },
      once: function () { return this; },
    };
    sessionMiddleware(req, res, next);
  });

  const activeChatConnections = new Map();

  io.on('connection', (socket) => {
    const userId = socket.request.session && socket.request.session.userId;
    console.log(`[Socket] New connection: socket.id=${socket.id}, userId=${userId}`);
    if (userId) {
      const userIdStr = String(userId);
      socket.join(`user:${userIdStr}`);
    }

    socket.on('enter_chat', () => {
      console.log(`[Socket] enter_chat event received: socket.id=${socket.id}, userId=${userId}`);
      if (userId) {
        const userIdStr = String(userId);
        if (!activeChatConnections.has(userIdStr)) {
          activeChatConnections.set(userIdStr, new Set());
        }
        activeChatConnections.get(userIdStr).add(socket.id);

        console.log(`[Socket] activeChatConnections for user ${userIdStr} size = ${activeChatConnections.get(userIdStr).size}`);


        if (activeChatConnections.get(userIdStr).size === 1) {
          console.log(`[Socket] User ${userIdStr} goes online - updating DB and emitting user_status`);
          User.findByIdAndUpdate(userId, { isOnline: true }).catch(err => console.error(err));
          io.emit('user_status', { userId: userIdStr, status: 'online' });
        }
      }
    });

    socket.on('typing', ({ toUserId }) => {
      if (userId && toUserId) {
        io.to(`user:${toUserId}`).emit('typing', { fromUserId: userId });
      }
    });

    socket.on('stop_typing', ({ toUserId }) => {
      if (userId && toUserId) {
        io.to(`user:${toUserId}`).emit('stop_typing', { fromUserId: userId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: socket.id=${socket.id}, userId=${userId}`);
      if (userId) {
        const userIdStr = String(userId);
        const conns = activeChatConnections.get(userIdStr);
        if (conns && conns.has(socket.id)) {
          conns.delete(socket.id);
          console.log(`[Socket] activeChatConnections for user ${userIdStr} size after disconnect = ${conns.size}`);
          if (conns.size === 0) {
            activeChatConnections.delete(userIdStr);
            console.log(`[Socket] User ${userIdStr} goes offline - updating DB and emitting user_status`);
            User.findByIdAndUpdate(userId, { isOnline: false }).catch(err => console.error(err));
            io.emit('user_status', { userId: userIdStr, status: 'offline' });
          }
        }
      }
    });
  });

  socketUtil.init(io);
}

if (process.env.NODE_ENV && !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

function gracefulShutdown(signal) {
  try {
    console.log(`\n🔁 Received ${signal} — shutting down server gracefully...`);
    server.close(() => {
      console.log('🛑 Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.warn('⚠️ Force exit after timeout');
      process.exit(1);
    }, 5000).unref();
  } catch (e) {
    console.error('Error during graceful shutdown', e);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

module.exports = app;
