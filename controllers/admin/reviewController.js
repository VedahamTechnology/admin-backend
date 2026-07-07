const Review = require('../../models/Review');
const Booking = require('../../models/Booking');

exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, rating } = req.query;
    const filter = {};
    if (rating) filter.rating = Number(rating);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const reviews = await Review.find(filter)
      .populate('booking', 'status bookingDate service vendor customer')
      .populate('user', 'firstName lastName email phone')
      .populate('vendor', 'firstName lastName email phone businessName')
      .populate('worker', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Review.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    await Booking.findByIdAndUpdate(review.booking, { $unset: { review: 1 } });
    await Review.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
