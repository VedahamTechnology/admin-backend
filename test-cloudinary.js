require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('Testing Cloudinary Upload...');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Try a base64 upload of a tiny 1x1 pixel image
const pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

cloudinary.uploader.upload(pixel, { folder: "test_folder" })
  .then(result => {
    console.log('✅ Upload Successful:');
    console.log('URL:', result.secure_url);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Upload Failed:');
    console.error('Code:', err.http_code);
    console.error('Message:', err.message);
    process.exit(1);
  });
