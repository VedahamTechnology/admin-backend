const express = require("express");
const dotenv = require("dotenv");
// Load environment variables immediately
dotenv.config();

const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIO = require("socket.io");
const { default: chalk } = require("chalk");
const figlet = require("figlet");
const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const userAdminRoutes = require("./routes/admin/userRoutes");
const vendorAdminRoutes = require("./routes/admin/vendorRoutes");
const categoryAdminRoutes = require("./routes/admin/categoryRoutes");
const catalogCategoryAdminRoutes = require("./routes/admin/catalogCategoryRoutes");
const catalogBrandAdminRoutes = require("./routes/admin/catalogBrandRoutes");
const serviceAdminRoutes = require("./routes/admin/serviceRoutes");
const bookingAdminRoutes = require("./routes/admin/bookingRoutes");
const dashboardAdminRoutes = require("./routes/admin/dashboardRoutes");
const workerAdminRoutes = require("./routes/admin/workerRoutes");
const exportAdminRoutes = require("./routes/admin/exportRoutes");
const sliderAdminRoutes = require("./routes/admin/sliderRoutes");
const paymentAdminRoutes = require("./routes/admin/paymentRoutes");
const settlementAdminRoutes = require("./routes/admin/settlementRoutes");
const reviewAdminRoutes = require("./routes/admin/reviewRoutes");
const scrapItemAdminRoutes = require("./routes/admin/scrapItemRoutes");
const planAdminRoutes = require("./routes/admin/planRoutes");
const withdrawalAdminRoutes = require("./routes/admin/withdrawalRoutes");
const vendorServiceRoutes = require("./routes/vendor/serviceRoutes");
const vendorBookingRoutes = require("./routes/vendor/bookingRoutes");
const vendorProfileRoutes = require("./routes/vendor/profileRoutes");
const vendorWorkerRoutes = require("./routes/vendor/workerRoutes");
const userServicesRoutes = require("./routes/user/servicesRoutes");
const userBookingRoutes = require("./routes/user/bookingRoutes");
const userPaymentRoutes = require("./routes/user/paymentRoutes");
const userAddressRoutes = require("./routes/user/addressRoutes");
const userSliderRoutes = require("./routes/user/sliderRoutes");
const userProfileRoutes = require("./routes/user/profileRoutes");
const userSubscriptionRoutes = require("./routes/user/subscriptionRoutes");
const planRoutes = require("./routes/planRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const scrapItemRoutes = require("./routes/scrapItemRoutes");
const withdrawalRoutes = require("./routes/withdrawalRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
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
app.use("/api/catalog", catalogRoutes);
app.use("/api/admin/users", userAdminRoutes);
app.use("/api/admin/vendors", vendorAdminRoutes);
app.use("/api/admin/categories", categoryAdminRoutes);
app.use("/api/admin/catalog/categories", catalogCategoryAdminRoutes);
app.use("/api/admin/catalog/brands", catalogBrandAdminRoutes);
app.use("/api/admin/services", serviceAdminRoutes);
app.use("/api/admin/workers", workerAdminRoutes);
app.use("/api/admin", bookingAdminRoutes);
app.use("/api/admin", dashboardAdminRoutes);
app.use("/api/admin/export", exportAdminRoutes);
app.use("/api/admin/sliders", sliderAdminRoutes);
app.use("/api/admin/payments", paymentAdminRoutes);
app.use("/api/admin/settlements", settlementAdminRoutes);
app.use("/api/admin/reviews", reviewAdminRoutes);
app.use("/api/admin/scrap-items", scrapItemAdminRoutes);
app.use("/api/admin/plans", planAdminRoutes);
app.use("/api/admin/withdrawals", withdrawalAdminRoutes);
app.use("/api/vendor/services", vendorServiceRoutes);
app.use("/api/vendor/bookings", vendorBookingRoutes);
app.use("/api/vendor/profile", vendorProfileRoutes);
app.use("/api/vendor/workers", vendorWorkerRoutes);
app.use("/api/user/services", userServicesRoutes);
app.use("/api/user/bookings", userBookingRoutes);
app.use("/api/user/payments", userPaymentRoutes);
app.use("/api/user/addresses", userAddressRoutes);
app.use("/api/user/sliders", userSliderRoutes);
app.use("/api/user/profile", userProfileRoutes);
app.use("/api/users", userSubscriptionRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/scrap-items", scrapItemRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(
    chalk.cyan(
      figlet.textSync("VEDHAM", {
        font: "3D-ASCII",
        horizontalLayout: "fitted",
        verticalLayout: "default",
        width: 160,
        whitespaceBreak: true,
      })
    )
  );
  console.log(`🔌 Socket.IO enabled for real-time notifications`);
});

module.exports = app;
