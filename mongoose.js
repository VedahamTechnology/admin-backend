const mongoose = require('mongoose');

mongoose.connect(
  'mongodb+srv://vedaham:4OcCU3QdouAVZ4sz@vedaham.gpdhqj3.mongodb.net/DB',
  {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4  // Force IPv4 instead of IPv6
  }
)
.then(() => {
  console.log('Connected');
  process.exit(0);
})
.catch(err => {
  console.log(err.message);
  process.exit(1);
});