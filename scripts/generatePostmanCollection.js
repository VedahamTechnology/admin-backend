const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const routesRoot = path.join(root, 'routes');

const mounts = {
  'authRoutes.js': '/api/auth',
  'catalogRoutes.js': '/api/catalog',
  'notificationRoutes.js': '/api/notifications',
  'planRoutes.js': '/api/plans',
  'scrapItemRoutes.js': '/api/scrap-items',
  'subscriptionRoutes.js': '/api/subscriptions',
  'withdrawalRoutes.js': '/api/withdrawals',
  'admin/catalogBrandRoutes.js': '/api/admin/catalog/brands',
  'admin/catalogCategoryRoutes.js': '/api/admin/catalog/categories',
  'admin/bookingRoutes.js': '/api/admin',
  'admin/categoryRoutes.js': '/api/admin/categories',
  'admin/dashboardRoutes.js': '/api/admin',
  'admin/exportRoutes.js': '/api/admin/export',
  'admin/paymentRoutes.js': '/api/admin/payments',
  'admin/planRoutes.js': '/api/admin/plans',
  'admin/reviewRoutes.js': '/api/admin/reviews',
  'admin/scrapItemRoutes.js': '/api/admin/scrap-items',
  'admin/serviceRoutes.js': '/api/admin/services',
  'admin/settlementRoutes.js': '/api/admin/settlements',
  'admin/sliderRoutes.js': '/api/admin/sliders',
  'admin/userRoutes.js': '/api/admin/users',
  'admin/vendorRoutes.js': '/api/admin/vendors',
  'admin/withdrawalRoutes.js': '/api/admin/withdrawals',
  'admin/workerRoutes.js': '/api/admin/workers',
  'user/addressRoutes.js': '/api/user/addresses',
  'user/bookingRoutes.js': '/api/user/bookings',
  'user/paymentRoutes.js': '/api/user/payments',
  'user/profileRoutes.js': '/api/user/profile',
  'user/servicesRoutes.js': '/api/user/services',
  'user/sliderRoutes.js': '/api/user/sliders',
  'user/subscriptionRoutes.js': '/api/users',
  'vendor/bookingRoutes.js': '/api/vendor/bookings',
  'vendor/profileRoutes.js': '/api/vendor/profile',
  'vendor/serviceRoutes.js': '/api/vendor/services',
  'vendor/workerRoutes.js': '/api/vendor/workers',
};

const authByPrefix = [
  { test: (p) => p.startsWith('/api/admin/'), value: '{{adminToken}}' },
  { test: (p) => p.startsWith('/api/vendor/'), value: '{{vendorToken}}' },
  { test: (p) => p.startsWith('/api/user/'), value: '{{customerToken}}' },
  { test: (p) => p.startsWith('/api/users/'), value: '{{customerToken}}' },
  { test: (p) => p.startsWith('/api/notifications'), value: '{{accessToken}}' },
  { test: (p) => p.startsWith('/api/subscriptions'), value: '{{customerToken}}' },
  { test: (p) => p.startsWith('/api/scrap-items'), value: '{{customerToken}}' },
  { test: (p) => p.startsWith('/api/withdrawals'), value: '{{vendorToken}}' },
];

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function extractRoutes(file) {
  const text = fs.readFileSync(file, 'utf8');
  const routes = [];
  const regex = /router\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[3],
    });
  }

  const routeChainRegex = /router\.route\(\s*(['"`])([^'"`]+)\1\s*\)\s*([\s\S]*?);/g;
  let chainMatch;
  while ((chainMatch = routeChainRegex.exec(text)) !== null) {
    const routePath = chainMatch[2];
    const chainBody = chainMatch[3];
    const methodRegex = /\.(get|post|put|patch|delete)\s*\(/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(chainBody)) !== null) {
      routes.push({
        method: methodMatch[1].toUpperCase(),
        path: routePath,
      });
    }
  }
  return routes;
}

function buildFullPath(file, routePath) {
  const rel = toPosix(path.relative(routesRoot, file));
  const mount = mounts[rel];
  if (!mount) {
    return null;
  }

  const base = mount.replace(/\/$/, '');
  const suffix = routePath === '/' ? '' : routePath;
  return `${base}${suffix}`;
}

function cleanBody(body) {
  if (!body) return undefined;
  return body;
}

function rawJson(obj) {
  return {
    mode: 'raw',
    raw: JSON.stringify(obj, null, 2),
    options: { raw: { language: 'json' } },
  };
}

function formData(items) {
  return {
    mode: 'formdata',
    formdata: items,
  };
}

function chooseAuth(fullPath, method, fileRel) {
  if (fileRel === 'authRoutes.js') {
    if (fullPath.endsWith('/logout') || fullPath.endsWith('/me')) {
      return '{{accessToken}}';
    }
    return null;
  }
  if (fileRel === 'planRoutes.js' || fileRel === 'user/subscriptionRoutes.js') {
    return fileRel === 'planRoutes.js' ? null : '{{customerToken}}';
  }
  if (fileRel === 'scrapItemRoutes.js') return '{{customerToken}}';
  if (fileRel === 'withdrawalRoutes.js') return '{{vendorToken}}';

  for (const rule of authByPrefix) {
    if (rule.test(fullPath)) return rule.value;
  }
  return null;
}

function expectedStatus(method, fullPath, fileRel) {
  const lower = fullPath.toLowerCase();
  if (method === 'GET') return 200;
  if (method === 'DELETE') return 200;
  if (lower.includes('/verify-payment')) return 200;
  if (lower.includes('/create-order')) return 200;
  if (lower.includes('/logout') || lower.endsWith('/me')) return 200;
  if (lower.includes('/refund')) return 200;
  if (lower.includes('/approve') || lower.includes('/unblock') || lower.includes('/block') || lower.includes('/cancel') || lower.includes('/status') || lower.includes('/complete') || lower.includes('/reject') || lower.includes('/assign') || lower.includes('/select') || lower.includes('/remove') || lower.includes('/image') || lower.includes('/location') || lower.includes('/availability') || lower.includes('/read') || lower.includes('/preferences')) {
    return 200;
  }
  if (method === 'POST') {
    if (lower.includes('/otp/request') || lower.includes('/otp/verify') || lower.includes('/login') || lower.includes('/refresh') || lower.includes('/settle') || lower.includes('/create-order') || lower.includes('/verify-payment')) return 200;
    return 201;
  }
  if (method === 'PUT' || method === 'PATCH') return 200;
  return 200;
}

function bodyFor(fileRel, method, fullPath) {
  const lower = fullPath.toLowerCase();
  const file = fileRel.toLowerCase();

  if (method === 'GET' || method === 'DELETE') return undefined;

  if (lower.includes('/auth/register/customer')) {
    return rawJson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.customer@example.com',
      phone: '9876543210',
      password: 'Password123',
      gender: 'male',
    });
  }

  if (lower.includes('/auth/register/worker')) {
    return formData([
      { key: 'firstName', value: 'Worker', type: 'text' },
      { key: 'lastName', value: 'One', type: 'text' },
      { key: 'email', value: 'worker.one@example.com', type: 'text' },
      { key: 'phone', value: '9876543222', type: 'text' },
      { key: 'password', value: 'Password123', type: 'text' },
      { key: 'gender', value: 'male', type: 'text' },
      { key: 'vendorId', value: '{{vendorId}}', type: 'text' },
      { key: 'serviceCategory', value: '{{categoryId}}', type: 'text' },
      { key: 'aadharNumber', value: '123412341234', type: 'text' },
      { key: 'panNumber', value: 'ABCDE1234F', type: 'text' },
      { key: 'aadharFront', type: 'file', src: '' },
    ]);
  }

  if (lower.includes('/auth/otp/request')) {
    return rawJson({
      phone: '9876543210',
      role: 'customer',
    });
  }

  if (lower.includes('/auth/otp/verify')) {
    return rawJson({
      phone: '9876543210',
      role: 'customer',
      otp: '123456',
    });
  }

  if (lower.includes('/auth/register/vendor')) {
    return formData([
      { key: 'firstName', value: 'Jane', type: 'text' },
      { key: 'lastName', value: 'Vendor', type: 'text' },
      { key: 'email', value: 'jane.vendor@example.com', type: 'text' },
      { key: 'phone', value: '9876543211', type: 'text' },
      { key: 'password', value: 'Password123', type: 'text' },
      { key: 'gender', value: 'female', type: 'text' },
      { key: 'businessName', value: 'Jane Services', type: 'text' },
      { key: 'ownerName', value: 'Jane Vendor', type: 'text' },
      { key: 'experience', value: '5', type: 'text' },
      { key: 'skills', value: 'Cleaning,Repair', type: 'text' },
      { key: 'serviceAreas', value: 'Delhi,Mumbai', type: 'text' },
      { key: 'aadharNumber', value: '123412341234', type: 'text' },
      { key: 'panNumber', value: 'ABCDE1234F', type: 'text' },
      { key: 'aadharFront', type: 'file', src: '' },
      { key: 'aadharBack', type: 'file', src: '' },
      { key: 'panCard', type: 'file', src: '' },
    ]);
  }

  if (lower.includes('/auth/login')) {
    return rawJson({
      email: 'admin@example.com',
      password: 'Password123',
      role: 'admin',
    });
  }

  if (lower.includes('/auth/refresh')) return undefined;
  if (lower.includes('/auth/logout')) return undefined;

  if (lower.includes('/auth/register')) {
    return rawJson({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '9876543210',
      password: 'Password123',
      gender: 'male',
    });
  }

  if (lower.includes('/admin/categories') && method === 'POST') {
    return formData([
      { key: 'name', value: 'Cleaning', type: 'text' },
      { key: 'description', value: 'Cleaning services', type: 'text' },
      { key: 'image', type: 'file', src: '' },
    ]);
  }

  if (lower.includes('/admin/categories') && method === 'PUT') {
    return formData([
      { key: 'name', value: 'Cleaning Updated', type: 'text' },
      { key: 'description', value: 'Updated cleaning services', type: 'text' },
      { key: 'image', type: 'file', src: '' },
    ]);
  }

  if (lower.includes('/admin/services') && method === 'POST') {
    return rawJson({
      name: 'AC Cleaning',
      description: 'Deep AC service',
      category: '{{categoryId}}',
      brand: '{{brandId}}',
      city_id: '{{cityId}}',
      basePrice: 999,
      estimatedDuration: 90,
      features: ['Filter cleaning', 'Gas check'],
      includes: ['Inspection'],
      excludes: ['Replacement parts'],
    });
  }

  if (lower.includes('/admin/services') && method === 'PUT') {
    return rawJson({
      name: 'AC Cleaning Updated',
      description: 'Updated service description',
      city_id: '{{cityId}}',
      basePrice: 1099,
      estimatedDuration: 100,
      isActive: true,
    });
  }

  if (lower.includes('/vendor/services') && method === 'POST') {
    return formData([
      { key: 'name', value: 'Kitchen Repair', type: 'text' },
      { key: 'description', value: 'Kitchen appliance repair', type: 'text' },
      { key: 'category', value: '{{categoryId}}', type: 'text' },
      { key: 'city_id', value: '{{cityId}}', type: 'text' },
      { key: 'basePrice', value: '799', type: 'text' },
      { key: 'estimatedDuration', value: '60', type: 'text' },
      { key: 'image', type: 'file', src: '' },
      { key: 'images', type: 'file', src: '' },
    ]);
  }

  if (lower.includes('/vendor/workers') && method === 'POST') {
    return formData([
      { key: 'firstName', value: 'Worker', type: 'text' },
      { key: 'lastName', value: 'One', type: 'text' },
      { key: 'email', value: 'worker.one@example.com', type: 'text' },
      { key: 'phone', value: '9876543222', type: 'text' },
      { key: 'password', value: 'Password123', type: 'text' },
      { key: 'gender', value: 'male', type: 'text' },
      { key: 'aadharNumber', value: '123412341234', type: 'text' },
      { key: 'panNumber', value: 'ABCDE1234F', type: 'text' },
      { key: 'serviceCategory', value: '{{categoryId}}', type: 'text' },
      { key: 'aadharFront', type: 'file', src: '' },
    ]);
  }

  if (lower.includes('/user/profile/image') || lower.includes('/vendor/profile/image') || lower.includes('/admin/categories') && lower.includes('/image')) {
    return formData([{ key: 'profileImage', type: 'file', src: '' }]);
  }

  if (lower.includes('/vendor/profile/services/select')) {
    return rawJson({ serviceId: '{{serviceId}}', vendorPrice: 799 });
  }
  if (lower.includes('/vendor/profile/services/remove')) {
    return rawJson({ serviceId: '{{serviceId}}' });
  }
  if (lower.includes('/vendor/profile/services/pricing')) {
    return rawJson({ serviceId: '{{serviceId}}', vendorPrice: 799, isAvailable: true });
  }
  if (lower.includes('/vendor/profile/categories')) {
    return rawJson({ categoryIds: ['{{categoryId}}'] });
  }

  if (lower.includes('/user/profile') || lower.includes('/vendor/profile') || lower.includes('/admin/sliders')) {
    return rawJson({
      title: 'Banner title',
      description: 'Banner description',
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      gender: 'male',
      businessName: 'Updated Business',
      ownerName: 'Updated Owner',
      experience: 5,
      skills: ['Cleaning'],
      address: 'Street name',
      city: 'Delhi',
      pincode: '110001',
      image: 'https://example.com/image.jpg',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      redirectUrl: 'https://example.com',
      priority: 1,
      isActive: true,
    });
  }

  if (lower.includes('/user/addresses')) {
    return rawJson({
      label: 'Home',
      street: '123 Main Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      latitude: 28.6139,
      longitude: 77.209,
      isDefault: true,
    });
  }

  if (lower.includes('/user/bookings') && lower.endsWith('/review')) {
    return rawJson({ rating: 5, comment: 'Excellent service' });
  }

  if (lower.includes('/user/bookings') && lower.endsWith('/cancel')) {
    return rawJson({ reason: 'Need to cancel' });
  }

  if (lower.includes('/user/bookings') && lower.endsWith('/reschedule')) {
    return rawJson({
      bookingDate: new Date(Date.now() + 86400000).toISOString(),
      timeSlot: { startTime: '10:00 AM', endTime: '11:00 AM' },
      reason: 'Need a different time',
    });
  }

  if (lower.includes('/user/bookings')) {
    return rawJson({
      serviceId: '{{serviceId}}',
      vendorId: '{{vendorId}}',
      city_id: '{{cityId}}',
      bookingDate: new Date(Date.now() + 86400000).toISOString(),
      timeSlot: { startTime: '10:00 AM', endTime: '11:00 AM' },
      serviceAddress: {
        street: '123 Main Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: 28.6139,
        longitude: 77.209,
        label: 'Home',
        instructions: 'Ring the bell',
      },
      paymentMethod: 'cash',
      customerNotes: 'Please call before arriving',
    });
  }

  if (lower.includes('/user/payments') && lower.includes('/create-order')) {
    return rawJson({ bookingId: '{{bookingId}}' });
  }

  if (lower.includes('/user/payments') && lower.includes('/verify-payment')) {
    return rawJson({
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_test',
      razorpay_signature: 'signature_test',
      bookingId: '{{bookingId}}',
    });
  }

  if (lower.includes('/vendor/bookings') && lower.includes('/accept')) return undefined;
  if (lower.includes('/vendor/bookings') && lower.includes('/complete')) return undefined;
  if (lower.includes('/vendor/bookings') && lower.includes('/verify-start-otp')) return rawJson({ otp: '123456' });
  if (lower.includes('/vendor/bookings') && lower.includes('/verify-end-otp')) return rawJson({ otp: '123456' });
  if (lower.includes('/vendor/bookings') && lower.includes('/proof-of-work')) {
    return rawJson({
      beforeImages: ['https://example.com/before.jpg'],
      afterImages: ['https://example.com/after.jpg'],
      vendorNotes: 'Work completed successfully',
    });
  }
  if (lower.includes('/vendor/bookings') && lower.includes('/assign-worker')) {
    return rawJson({ workerId: '{{workerId}}' });
  }
  if (lower.includes('/vendor/bookings') && lower.includes('/reject')) {
    return rawJson({ reason: 'Not available at this time' });
  }
  if (lower.includes('/vendor/bookings') && lower.includes('/cancel')) {
    return rawJson({ reason: 'Emergency cancellation' });
  }

  if (lower.includes('/vendor/profile') && lower.includes('/location')) {
    return rawJson({ latitude: 28.6139, longitude: 77.209 });
  }
  if (lower.includes('/vendor/profile') && lower.includes('/availability')) {
    return rawJson({ isAvailable: true });
  }

  if (lower.includes('/admin/vendors') && lower.endsWith('/reject')) return rawJson({ reason: 'Incomplete documents' });
  if (lower.includes('/admin/workers') && lower.endsWith('/reject')) return rawJson({ reason: 'Incomplete documents' });
  if (lower.includes('/admin/bookings') && lower.endsWith('/status')) return rawJson({ status: 'confirmed' });
  if (lower.includes('/admin/bookings') && lower.endsWith('/cancel')) return rawJson({ reason: 'Admin cancellation' });
  if (lower.includes('/admin/payments') && lower.includes('/refund')) return rawJson({ paymentId: '{{paymentId}}', amount: 500, reason: 'Requested refund' });
  if (lower.includes('/admin/settlements') && lower.endsWith('/settle')) return rawJson({ amount: 500, notes: 'Manual settlement' });
  if (lower.includes('/admin/settlements') && lower.endsWith('/block')) return rawJson({ notes: 'Risk limit reached' });
  if (lower.includes('/admin/settlements') && lower.endsWith('/unblock')) return undefined;
  if (lower.includes('/admin/withdrawals') && lower.endsWith('/reject')) return rawJson({ reason: 'Insufficient balance' });
  if (lower.includes('/admin/plan')) return rawJson({
    name: 'Gold Plan',
    description: 'Priority service plan',
    price: 999,
    durationMonths: 3,
    benefits: ['Priority support', 'Discounts'],
    isActive: true,
  });

  if (lower.includes('/scrap-items')) {
    return rawJson({
      applianceType: 'Old Refrigerator',
      description: 'Need pickup from home',
      photos: ['https://example.com/photo.jpg'],
      pickupDate: new Date(Date.now() + 86400000).toISOString(),
      notes: 'Call on arrival',
    });
  }

  if (lower.includes('/subscriptions')) return rawJson({ planId: '{{planId}}' });

  if (lower.includes('/notifications') && lower.includes('/broadcast')) {
    return rawJson({
      title: 'Promo',
      body: 'Special offer',
      recipientType: 'customer',
    });
  }

  if (lower.includes('/admin/sliders')) {
    return rawJson({
      title: 'Weekend Offer',
      description: 'Big savings this weekend',
      image: 'https://example.com/slider.jpg',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      redirectUrl: 'https://example.com',
      priority: 1,
      isActive: true,
    });
  }

  if (lower.includes('/vendor/worker') && method === 'POST') return undefined;

  if (lower.endsWith('/status')) {
    return rawJson({ status: 'approved' });
  }

  if (lower.endsWith('/approve') || lower.endsWith('/unblock') || lower.endsWith('/read') || lower.endsWith('/preferences')) {
    return undefined;
  }

  if (method === 'PUT' || method === 'PATCH') {
    return rawJson({
      isActive: true,
    });
  }

  return rawJson({});
}

function collectionTestScript(fullPath) {
  return [
    'const contentType = pm.response.headers.get("Content-Type") || "";',
    'pm.test("Status code is successful", function () {',
    '  pm.expect(pm.response.code).to.be.within(200, 299);',
    '});',
    'if (contentType.includes("application/json")) {',
    '  let json = null;',
    '  pm.test("Response is valid JSON", function () {',
    '    json = pm.response.json();',
    '    pm.expect(json).to.be.an("object");',
    '  });',
    '  try {',
    '    json = json || pm.response.json();',
    '  } catch (e) {}',
    '  if (json) {',
    '    if (json.accessToken) {',
    '      pm.environment.set("accessToken", json.accessToken);',
    '      if (json.user && json.user.role) {',
    '        const roleMap = { customer: "customerToken", vendor: "vendorToken", worker: "workerToken", admin: "adminToken" };',
    '        const key = roleMap[json.user.role];',
    '        if (key) pm.environment.set(key, json.accessToken);',
    '      }',
    '    }',
    '    const storeId = (key, value) => { if (value) pm.environment.set(key, String(value)); };',
    '    storeId("userId", json?.user?.id || json?.user?._id || json?.id);',
    '    storeId("bookingId", json?.booking?._id || json?.booking?.id || json?.data?._id || json?.data?.id);',
    '    storeId("serviceId", json?.service?._id || json?.service?.id || json?.data?.service?._id);',
    '    storeId("categoryId", json?.category?._id || json?.category?.id || json?.data?.category?._id);',
    '    storeId("vendorId", json?.vendor?._id || json?.vendor?.id || json?.data?.vendor?._id);',
    '    storeId("workerId", json?.worker?._id || json?.worker?.id || json?.data?.worker?._id);',
    '    storeId("paymentId", json?.payment?._id || json?.payment?.id || json?.data?._id);',
    '    storeId("planId", json?.plan?._id || json?.plan?.id || json?.data?._id);',
    '    storeId("subscriptionId", json?.subscription?._id || json?.subscription?.id || json?.data?._id);',
    '    storeId("reviewId", json?.review?._id || json?.review?.id || json?.data?._id);',
    '    storeId("scrapItemId", json?.scrapItem?._id || json?.scrapItem?.id || json?.data?._id);',
    '    storeId("settlementId", json?.settlement?._id || json?.settlement?.id || json?.data?._id);',
    '    storeId("withdrawalId", json?.withdrawal?._id || json?.withdrawal?.id || json?.data?._id);',
    '    storeId("notificationId", json?.notification?._id || json?.notification?.id || json?.data?._id);',
    '    storeId("sliderId", json?.slider?._id || json?.slider?.id || json?.data?._id);',
    '  }',
    '}',
  ].join('\n');
}

function makeItem(fileRel, method, routePath) {
  const fullPath = buildFullPath(path.join(routesRoot, fileRel), routePath);
  if (!fullPath) return null;
  const authToken = chooseAuth(fullPath, method, fileRel);
  const body = cleanBody(bodyFor(fileRel, method, fullPath));
  const description = `Auto-generated from ${fileRel}. Expected status: ${expectedStatus(method, fullPath, fileRel)}.`;
  const cityScopedGet = method === 'GET' && (
    fileRel === 'user/servicesRoutes.js' ||
    fileRel === 'catalogRoutes.js' ||
    fileRel === 'vendor/serviceRoutes.js' ||
    fileRel === 'admin/bookingRoutes.js'
  );
  const urlPath = cityScopedGet ? `${fullPath}${fullPath.includes('?') ? '&' : '?'}city_id={{cityId}}` : fullPath;
  const req = {
    method,
    header: [
      { key: 'Accept', value: 'application/json' },
    ],
    url: `{{baseUrl}}${urlPath}`,
    description,
  };
  if (authToken) {
    req.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: authToken, type: 'string' }],
    };
  }
  if (body) req.body = body;
  const item = {
    name: `${method} ${fullPath}`,
    request: req,
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            `pm.test("Expected status code ${expectedStatus(method, fullPath, fileRel)}", function () {`,
            `  pm.expect(pm.response.code).to.eql(${expectedStatus(method, fullPath, fileRel)});`,
            '});',
            'const contentType = pm.response.headers.get("Content-Type") || "";',
            'if (contentType.includes("application/json")) {',
            '  pm.test("Response is valid JSON", function () {',
            '    pm.expect(() => pm.response.json()).to.not.throw();',
            '  });',
            '}',
          ],
        },
      },
    ],
  };
  return item;
}

function folderize(name, items) {
  return {
    name,
    item: items.filter(Boolean),
  };
}

function prettySegment(segment) {
  return segment
    .replace(/Routes?\.js$/i, '')
    .replace(/Routes?$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

const grouped = new Map();

for (const file of walk(routesRoot)) {
  const rel = toPosix(path.relative(routesRoot, file));
  const routes = extractRoutes(file);
  if (!routes.length) continue;
  for (const route of routes) {
    const item = makeItem(rel, route.method, route.path);
    if (!item) continue;
    const top = rel.split('/')[0] === 'admin' ? `Admin ${prettySegment(rel.split('/')[1] || 'Routes')}` :
      rel.split('/')[0] === 'user' ? `User ${prettySegment(rel.split('/')[1] || 'Routes')}` :
      rel.split('/')[0] === 'vendor' ? `Vendor ${prettySegment(rel.split('/')[1] || 'Routes')}` :
      rel === 'authRoutes.js' ? 'Authentication' :
      rel === 'catalogRoutes.js' ? 'Catalog' :
      rel === 'notificationRoutes.js' ? 'Notifications' :
      rel === 'planRoutes.js' ? 'Plans' :
      rel === 'subscriptionRoutes.js' ? 'Subscriptions' :
      rel === 'scrapItemRoutes.js' ? 'Scrap Items' :
      rel === 'withdrawalRoutes.js' ? 'Withdrawals' :
      'System';
    if (!grouped.has(top)) grouped.set(top, []);
    grouped.get(top).push(item);
  }
}

const collection = {
  info: {
    name: 'Homster Backend APIs',
    _postman_id: 'homster-backend-apis-generated',
    description: 'Auto-generated collection from the current Homster backend route files.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000' },
    { key: 'accessToken', value: '' },
    { key: 'adminToken', value: '' },
    { key: 'customerToken', value: '' },
    { key: 'vendorToken', value: '' },
    { key: 'workerToken', value: '' },
    { key: 'userId', value: '' },
    { key: 'adminUserId', value: '' },
    { key: 'vendorId', value: '' },
    { key: 'workerId', value: '' },
    { key: 'categoryId', value: '' },
    { key: 'brandId', value: '' },
    { key: 'cityId', value: '' },
    { key: 'serviceId', value: '' },
    { key: 'bookingId', value: '' },
    { key: 'addressId', value: '' },
    { key: 'paymentId', value: '' },
    { key: 'transactionId', value: '' },
    { key: 'settlementId', value: '' },
    { key: 'withdrawalId', value: '' },
    { key: 'reviewId', value: '' },
    { key: 'planId', value: '' },
    { key: 'subscriptionId', value: '' },
    { key: 'scrapItemId', value: '' },
    { key: 'notificationId', value: '' },
    { key: 'sliderId', value: '' },
  ],
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: collectionTestScript(''),
      },
    },
  ],
  item: [
    {
      name: 'Health',
      item: [
        makeItem('authRoutes.js', 'GET', '/health') || {
          name: 'GET /health',
          request: { method: 'GET', url: '{{baseUrl}}/health', header: [{ key: 'Accept', value: 'application/json' }] },
          event: [{
            listen: 'test',
            script: { type: 'text/javascript', exec: ['pm.test("Expected status code 200", function () { pm.expect(pm.response.code).to.eql(200); });'] },
          }],
          response: [],
        },
      ],
    },
    ...Array.from(grouped.entries()).map(([name, items]) => folderize(name, items)),
  ],
};

const env = {
  name: 'Homster Local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:5000', enabled: true },
    { key: 'accessToken', value: '', enabled: true },
    { key: 'adminToken', value: '', enabled: true },
    { key: 'customerToken', value: '', enabled: true },
    { key: 'vendorToken', value: '', enabled: true },
    { key: 'workerToken', value: '', enabled: true },
    { key: 'userId', value: '', enabled: true },
    { key: 'adminUserId', value: '', enabled: true },
    { key: 'vendorId', value: '', enabled: true },
    { key: 'workerId', value: '', enabled: true },
    { key: 'categoryId', value: '', enabled: true },
    { key: 'brandId', value: '', enabled: true },
    { key: 'cityId', value: '', enabled: true },
    { key: 'serviceId', value: '', enabled: true },
    { key: 'bookingId', value: '', enabled: true },
    { key: 'addressId', value: '', enabled: true },
    { key: 'paymentId', value: '', enabled: true },
    { key: 'transactionId', value: '', enabled: true },
    { key: 'settlementId', value: '', enabled: true },
    { key: 'withdrawalId', value: '', enabled: true },
    { key: 'reviewId', value: '', enabled: true },
    { key: 'planId', value: '', enabled: true },
    { key: 'subscriptionId', value: '', enabled: true },
    { key: 'scrapItemId', value: '', enabled: true },
    { key: 'notificationId', value: '', enabled: true },
    { key: 'sliderId', value: '', enabled: true },
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: 'Codex',
};

fs.writeFileSync(path.join(root, 'homster.postman_collection.json'), JSON.stringify(collection, null, 2));
fs.writeFileSync(path.join(root, 'homster.postman_environment.json'), JSON.stringify(env, null, 2));

console.log('Generated homster.postman_collection.json and homster.postman_environment.json');
