const express      = require('express');
const dotenv       = require('dotenv');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB    = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const authRoutes   = require('./routes/authRoutes');
const userAdminRoutes = require('./routes/admin/userRoutes');
const vendorAdminRoutes = require('./routes/admin/vendorRoutes');
dotenv.config();
connectDB();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/users', userAdminRoutes);
app.use('/api/admin/vendors', vendorAdminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;