const Booking = require('../../models/Booking');
const User = require('../../models/User');
const Service = require('../../models/Service');
const json2csv = require('json2csv').Parser;

/**
 * Export bookings as CSV
 * GET /api/admin/export/csv?period=week|month|year
 */
exports.exportBookingsCSV = async (req, res) => {
  try {
    const { period = 'month', status } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    let filter = {
      createdAt: { $gte: startDate, $lte: now },
    };

    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('customer', 'firstName lastName email phone userId')
      .populate('vendor', 'firstName lastName businessName email phone userId')
      .populate('service', 'name')
      .populate('category', 'name')
      .lean();

    // Transform bookings for CSV
    const csvData = bookings.map((booking) => ({
      'Booking ID': booking.bookingId,
      'Customer Name': `${booking.customer?.firstName} ${booking.customer?.lastName}`,
      'Customer Email': booking.customer?.email,
      'Customer Phone': booking.customer?.phone,
      'Vendor Name': booking.vendor?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
      'Vendor Email': booking.vendor?.email,
      'Service': booking.service?.name,
      'Category': booking.category?.name,
      'Booking Date': new Date(booking.bookingDate).toLocaleDateString(),
      'Time Slot': `${booking.timeSlot?.startTime} - ${booking.timeSlot?.endTime}`,
      'Status': booking.status,
      'Service Address': `${booking.serviceAddress?.street}, ${booking.serviceAddress?.city}, ${booking.serviceAddress?.state} ${booking.serviceAddress?.pincode}`,
      'Base Price': booking.pricing?.basePrice,
      'Platform Fee': booking.pricing?.platformFee,
      'Tax': booking.pricing?.tax,
      'Total Amount': booking.pricing?.totalAmount,
      'Vendor Payout': booking.pricing?.vendorPayout,
      'Created At': new Date(booking.createdAt).toLocaleString(),
    }));

    if (csvData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No bookings found for the specified period and filters',
      });
    }

    // Create CSV
    const parser = new json2csv({
      fields: [
        'Booking ID',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Vendor Name',
        'Vendor Email',
        'Service',
        'Category',
        'Booking Date',
        'Time Slot',
        'Status',
        'Service Address',
        'Base Price',
        'Platform Fee',
        'Tax',
        'Total Amount',
        'Vendor Payout',
        'Created At',
      ],
    });

    const csv = parser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="bookings-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export users as CSV
 */
exports.exportUsersCSV = async (req, res) => {
  try {
    const { period = 'month', role } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    let filter = {
      createdAt: { $gte: startDate, $lte: now },
    };

    if (role && ['customer', 'vendor'].includes(role)) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password -refreshToken')
      .lean();

    // Transform users for CSV
    const csvData = users.map((user) => ({
      'User ID': user.userId,
      'Name': `${user.firstName} ${user.lastName || ''}`,
      'Email': user.email,
      'Phone': user.phone,
      'Role': user.role,
      'Gender': user.gender || 'N/A',
      'City': user.location?.city || 'N/A',
      'Pincode': user.location?.pincode || 'N/A',
      'Is Active': user.isActive ? 'Yes' : 'No',
      'Is Banned': user.isBanned ? 'Yes' : 'No',
      ...(user.role === 'vendor' && {
        'Business Name': user.vendor?.businessName,
        'Business Owner': user.vendor?.ownerName,
        'Experience (years)': user.vendor?.experience,
        'Verification Status': user.vendor?.verificationStatus,
        'Is Available': user.vendor?.isAvailable ? 'Yes' : 'No',
        'Registered Date': user.vendor?.registeredOn ? new Date(user.vendor.registeredOn).toLocaleDateString() : 'N/A',
      }),
      'Joined Date': new Date(user.createdAt).toLocaleDateString(),
    }));

    if (csvData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found for the specified period and filters',
      });
    }

    // Determine fields based on whether vendors are included
    const hasVendors = csvData.some((row) => row['Business Name']);
    const fields = hasVendors
      ? [
        'User ID',
        'Name',
        'Email',
        'Phone',
        'Role',
        'Gender',
        'City',
        'Pincode',
        'Is Active',
        'Is Banned',
        'Business Name',
        'Business Owner',
        'Experience (years)',
        'Verification Status',
        'Is Available',
        'Registered Date',
        'Joined Date',
      ]
      : [
        'User ID',
        'Name',
        'Email',
        'Phone',
        'Role',
        'Gender',
        'City',
        'Pincode',
        'Is Active',
        'Is Banned',
        'Joined Date',
      ];

    const parser = new json2csv({ fields });
    const csv = parser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export services as CSV
 */
exports.exportServicesCSV = async (req, res) => {
  try {
    const { period = 'month', status } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    let filter = {
      createdAt: { $gte: startDate, $lte: now },
    };

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.approvalStatus = status;
    }

    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('createdByVendor', 'firstName lastName businessName email')
      .lean();

    // Transform services for CSV
    const csvData = services.map((service) => ({
      'Service ID': service.serviceId,
      'Service Name': service.name,
      'Category': service.category?.name,
      'Brand': service.brand?.name || 'N/A',
      'Base Price': service.basePrice,
      'Discounted Price': service.discountedPrice,
      'Estimated Duration': service.estimatedDuration,
      'Duration Unit': service.durationUnit,
      'Vendor Count': service.vendors?.length || 0,
      'Rating': service.ratings?.average || 'N/A',
      'Rating Count': service.ratings?.count || 0,
      'Is Active': service.isActive ? 'Yes' : 'No',
      'Approval Status': service.approvalStatus,
      'Is Approved': service.isApproved ? 'Yes' : 'No',
      'Created By': service.createdByVendor
        ? `${service.createdByVendor.firstName} ${service.createdByVendor.lastName || ''}`
        : 'Admin',
      'Created Date': new Date(service.createdAt).toLocaleDateString(),
    }));

    if (csvData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No services found for the specified period and filters',
      });
    }

    const parser = new json2csv({
      fields: [
        'Service ID',
        'Service Name',
        'Category',
        'Brand',
        'Base Price',
        'Discounted Price',
        'Estimated Duration',
        'Duration Unit',
        'Vendor Count',
        'Rating',
        'Rating Count',
        'Is Active',
        'Approval Status',
        'Is Approved',
        'Created By',
        'Created Date',
      ],
    });

    const csv = parser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="services-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Export revenue report as CSV
 */
exports.exportRevenueReportCSV = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get daily revenue data
    const revenueData = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          bookingCount: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' },
          platformFee: { $sum: '$pricing.platformFee' },
          tax: { $sum: '$pricing.tax' },
          vendorPayout: { $sum: '$pricing.vendorPayout' },
          avgBookingValue: { $avg: '$pricing.totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Add totals
    const totals = revenueData.reduce(
      (acc, day) => ({
        bookingCount: acc.bookingCount + day.bookingCount,
        totalAmount: acc.totalAmount + day.totalAmount,
        platformFee: acc.platformFee + day.platformFee,
        tax: acc.tax + day.tax,
        vendorPayout: acc.vendorPayout + day.vendorPayout,
      }),
      { bookingCount: 0, totalAmount: 0, platformFee: 0, tax: 0, vendorPayout: 0 }
    );

    // Transform for CSV
    const csvData = revenueData.map((day) => ({
      'Date': day._id,
      'Bookings': day.bookingCount,
      'Total Revenue': day.totalAmount,
      'Platform Fee': day.platformFee,
      'Tax': day.tax,
      'Vendor Payout': day.vendorPayout,
      'Avg Booking Value': day.avgBookingValue.toFixed(2),
    }));

    // Add totals row
    csvData.push({
      'Date': 'TOTAL',
      'Bookings': totals.bookingCount,
      'Total Revenue': totals.totalAmount,
      'Platform Fee': totals.platformFee,
      'Tax': totals.tax,
      'Vendor Payout': totals.vendorPayout,
      'Avg Booking Value': (totals.totalAmount / totals.bookingCount).toFixed(2),
    });

    if (csvData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No revenue data found for the specified period',
      });
    }

    const parser = new json2csv({
      fields: ['Date', 'Bookings', 'Total Revenue', 'Platform Fee', 'Tax', 'Vendor Payout', 'Avg Booking Value'],
    });

    const csv = parser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="revenue-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
