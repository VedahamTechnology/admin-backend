const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIO = require("socket.io");
const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const userAdminRoutes = require("./routes/admin/userRoutes");
const vendorAdminRoutes = require("./routes/admin/vendorRoutes");
const categoryAdminRoutes = require("./routes/admin/categoryRoutes");
const serviceAdminRoutes = require("./routes/admin/serviceRoutes");
const bookingAdminRoutes = require("./routes/admin/bookingRoutes");
const dashboardAdminRoutes = require("./routes/admin/dashboardRoutes");
const workerAdminRoutes = require("./routes/admin/workerRoutes");
const exportAdminRoutes = require("./routes/admin/exportRoutes");
const vendorServiceRoutes = require("./routes/vendor/serviceRoutes");
const vendorBookingRoutes = require("./routes/vendor/bookingRoutes");
const vendorProfileRoutes = require("./routes/vendor/profileRoutes");
const vendorWorkerRoutes = require("./routes/vendor/workerRoutes");
const userServicesRoutes = require("./routes/user/servicesRoutes");
const userBookingRoutes = require("./routes/user/bookingRoutes");
const userPaymentRoutes = require("./routes/user/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
  transports: ["websocket", "polling"],
});

// Make io accessible to routes
app.set("io", io);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Socket.IO middleware - authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  socket.token = token;
  next();
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`📱 User connected: ${socket.id}`);

  // User joins their personal notification room
  socket.on("user:join", (userId) => {
    socket.join(`user:${userId}`);
    console.log(`✓ User ${userId} joined notification room`);
  });

  // User leaves their notification room
  socket.on("user:leave", (userId) => {
    socket.leave(`user:${userId}`);
    console.log(`✓ User ${userId} left notification room`);
  });

  socket.on("disconnect", () => {
    console.log(`📱 User disconnected: ${socket.id}`);
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin/users", userAdminRoutes);
app.use("/api/admin/vendors", vendorAdminRoutes);
app.use("/api/admin/categories", categoryAdminRoutes);
app.use("/api/admin/services", serviceAdminRoutes);
app.use("/api/admin/workers", workerAdminRoutes);
app.use("/api/admin", bookingAdminRoutes);
app.use("/api/admin", dashboardAdminRoutes);
app.use("/api/admin/export", exportAdminRoutes);
app.use("/api/vendor/services", vendorServiceRoutes);
app.use("/api/vendor/bookings", vendorBookingRoutes);
app.use("/api/vendor/profile", vendorProfileRoutes);
app.use("/api/vendor/workers", vendorWorkerRoutes);
app.use("/api/user/services", userServicesRoutes);
app.use("/api/user/bookings", userBookingRoutes);
app.use("/api/user/payments", userPaymentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
  console.log(`🔌 Socket.IO enabled for real-time notifications`);
});

module.exports = app;
