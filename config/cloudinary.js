const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      const url = req.originalUrl;
      let folderPath = 'homster';

      if (url.includes('register/vendor')) {
        // Structured by applicant email or phone for registration
        const identifier = req.body.email || req.body.phone || 'onboarding';
        folderPath += `/vendors/onboarding/${identifier}`;
      }
      else if (url.includes('vendor/services')) {
        // Group by vendor ID
        const vendorId = req.user ? req.user._id : 'general';
        folderPath += `/services/${vendorId}`;
      }
      else if (url.includes('admin/categories')) {
        folderPath += `/categories`;
      }
      else if (url.includes('vendor/workers')) {
        // Group by vendor then worker subfolder
        const vendorId = req.user ? req.user._id : 'workers_list';
        folderPath += `/vendors/${vendorId}/workers`;
      }
      else if (url.includes('profile')) {
        const userId = req.user ? req.user._id : 'users';
        folderPath += `/profiles/${userId}`;
      }
      else {
        folderPath += '/misc';
      }

      return folderPath;
    },
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `${file.fieldname}-${uniqueSuffix}`;
    },
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
