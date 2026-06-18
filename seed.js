const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Load models
const User = require('./models/User');
const Category = require('./models/Category');
const Service = require('./models/Service');

const categoriesData = [
  {
    name: 'Home Cleaning',
    description: 'Professional home cleaning services',
    icon: 'cleaning_icon',
    tags: ['home', 'cleaning', 'hygiene'],
    basePrice: 500,
    isActive: true
  },
  {
    name: 'Plumbing',
    description: 'Expert plumbing repairs and installations',
    icon: 'plumbing_icon',
    tags: ['plumbing', 'repair', 'water'],
    basePrice: 300,
    isActive: true
  },
  {
    name: 'Electrical',
    description: 'Safe and reliable electrical services',
    icon: 'electrical_icon',
    tags: ['electrical', 'wiring', 'repair'],
    basePrice: 400,
    isActive: true
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Drop legacy collections or indexes to prevent old unique constraints (like categoryId_1) from causing errors
    try {
      await Category.collection.drop();
      console.log('Dropped old categories collection to clear legacy indexes...');
    } catch (err) {
      // Collection might not exist yet, ignore
    }

    try {
      await Service.collection.drop();
      console.log('Dropped old services collection to clear legacy indexes...');
    } catch (err) {
      // Collection might not exist yet, ignore
    }

    try {
      await User.collection.drop();
      console.log('Dropped old users collection to clear legacy indexes...');
    } catch (err) {
      // Collection might not exist yet, ignore
    }

    // Clear existing users (fallback if drop fails or for clarity)
    await User.deleteMany({});
    console.log('Cleared all existing users...');

    // 1. Seed Categories
    const categories = [];
    for (const cat of categoriesData) {
      const category = await Category.create(cat);
      categories.push(category);
    }
    console.log(`${categories.length} Categories seeded...`);

    // 2. Seed Vendors
    const vendorsData = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'vendor1@example.com',
        phone: '9876543210',
        password: 'password123',
        role: 'vendor',
        vendor: {
          businessName: "John's Premium Cleaning",
          ownerName: 'John Doe',
          experience: 5,
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: [categories[0]._id] // Home Cleaning
        }
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'vendor2@example.com',
        phone: '9876543211',
        password: 'password123',
        role: 'vendor',
        vendor: {
          businessName: "Jane's Multi-Services",
          ownerName: 'Jane Smith',
          experience: 8,
          verificationStatus: 'approved',
          isAvailable: true,
          serviceCategories: [categories[0]._id, categories[1]._id, categories[2]._id] // Cleaning, Plumbing, and Electrical
        }
      }
    ];

    const vendors = [];
    for (const v of vendorsData) {
      const vendor = await User.create(v);
      vendors.push(vendor);
    }
    console.log(`${vendors.length} Vendors seeded...`);

    // 3. Seed 18 Services (6 per category, distributed between vendors)
    const servicesData = [
      // --- Category 0: Home Cleaning ---
      {
        name: 'Full Home Deep Cleaning',
        description: 'Comprehensive detailed cleaning of all rooms, bathrooms, balconies, and kitchen spaces.',
        category: categories[0]._id,
        vendor: vendors[0]._id,
        basePrice: 2499,
        estimatedDuration: 240,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[0]._id
      },
      {
        name: 'Express Kitchen Cleaning',
        description: 'Quick but effective degreasing and cleaning of kitchen surfaces, counter tops, and appliances.',
        category: categories[0]._id,
        vendor: vendors[1]._id,
        basePrice: 899,
        estimatedDuration: 90,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Sofa and Upholstery Cleaning',
        description: 'Vacuuming, shampooing, and wet extraction cleaning for fabric and leather sofas.',
        category: categories[0]._id,
        vendor: vendors[0]._id,
        basePrice: 599,
        estimatedDuration: 60,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[0]._id
      },
      {
        name: 'Bathroom Disinfection & Scrubbing',
        description: 'Intense anti-bacterial scrubbing of wall tiles, floors, sink, bathtub, and toilet bowl.',
        category: categories[0]._id,
        vendor: vendors[1]._id,
        basePrice: 399,
        estimatedDuration: 45,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Premium Carpet Shampooing',
        description: 'Deep fiber washing and extraction mechanism to remove tough stains and heavy dust from carpets.',
        category: categories[0]._id,
        vendor: vendors[0]._id,
        basePrice: 799,
        estimatedDuration: 90,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[0]._id
      },
      {
        name: 'Glass Window & Mesh Cleaning',
        description: 'Full window frame scrubbing, mesh washing, and vacuuming of tracks for crystal clear windows.',
        category: categories[0]._id,
        vendor: vendors[1]._id,
        basePrice: 299,
        estimatedDuration: 60,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },

      // --- Category 1: Plumbing ---
      {
        name: 'Leaking Tap and Faucet Repair',
        description: 'Quick fix, gasket replacement, or complete renewal of leaky taps, bib cocks, and valves.',
        category: categories[1]._id,
        vendor: vendors[1]._id,
        basePrice: 199,
        estimatedDuration: 30,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Drainage Pipe Unclogging',
        description: 'Clearing blocked kitchen sinks, wash basins, bathroom floor drains, and sewage lines.',
        category: categories[1]._id,
        vendor: vendors[1]._id,
        basePrice: 349,
        estimatedDuration: 60,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Water Tank Professional Cleaning',
        description: 'Scrubbing, high-pressure washing, and vacuuming of overhead or underground water storage tanks.',
        category: categories[1]._id,
        vendor: vendors[1]._id,
        basePrice: 999,
        estimatedDuration: 120,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Toilet Flush Fitting & Tank Repair',
        description: 'Fixing or installing a fresh internal siphon mechanism, ball valve, or push-button kit.',
        category: categories[1]._id,
        vendor: vendors[1]._id,
        basePrice: 249,
        estimatedDuration: 45,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'New Pipeline & Fitting Installation',
        description: 'Laying out high-quality CPVC/GI water supply pipelines or new sanitary connections.',
        category: categories[1]._id,
        vendor: vendors[1]._id,
        basePrice: 499,
        estimatedDuration: 90,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Water Heater Geyser Service & Repair',
        description: 'Fixing heating element issues, thermostat malfunctions, or resolving tank leaks.',
        category: categories[1]._id,
        vendor: vendors[1]._id,
        basePrice: 399,
        estimatedDuration: 60,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },

      // --- Category 2: Electrical ---
      {
        name: 'Ceiling and Exhaust Fan Installation',
        description: 'Complete unboxing, precise balancing, and safe mounting/wiring of any fan type.',
        category: categories[2]._id,
        vendor: vendors[1]._id,
        basePrice: 149,
        estimatedDuration: 30,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Modular Switchboard Repair',
        description: 'Replacing burnt switch sockets, indicators, regulatory knobs, or full board rewiring.',
        category: categories[2]._id,
        vendor: vendors[1]._id,
        basePrice: 199,
        estimatedDuration: 40,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Air Conditioner Jet Servicing',
        description: 'High-pressure foam and water jet cleanup of cooling coils, filters, and drain tray.',
        category: categories[2]._id,
        vendor: vendors[1]._id,
        basePrice: 599,
        estimatedDuration: 60,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Short Circuit Fault Finding',
        description: 'Surgical testing of home wiring to trace loose connections, MCB trips, or earthing faults.',
        category: categories[2]._id,
        vendor: vendors[1]._id,
        basePrice: 499,
        estimatedDuration: 90,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'LED Decorative Light Installation',
        description: 'Fixing decorative wall lights, panel lamps, spot lights, or fancy ceiling chandeliers.',
        category: categories[2]._id,
        vendor: vendors[1]._id,
        basePrice: 99,
        estimatedDuration: 20,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      },
      {
        name: 'Home Inverter Setup & Water Top-up',
        description: 'Installing backup power inverter units, connecting batteries, and topping up distilled water levels.',
        category: categories[2]._id,
        vendor: vendors[1]._id,
        basePrice: 299,
        estimatedDuration: 45,
        durationUnit: 'minutes',
        approvalStatus: 'approved',
        isApproved: true,
        isActive: true,
        createdByVendor: vendors[1]._id
      }
    ];

    for (const s of servicesData) {
      await Service.create(s);
    }
    console.log(`${servicesData.length} Services seeded and approved successfully!`);

    console.log('Seeding completed successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
