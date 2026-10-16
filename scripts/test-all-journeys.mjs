import assert from 'assert';

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:3000';

async function fetchJson(url, options = {}) {
  const headers = { ...options.headers };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

function getCookieString(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
  const single = headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
}

async function runAllJourneys() {
  console.log('====================================================');
  console.log('🐾 PAWNEST PHASE 9: END-TO-END CUSTOMER JOURNEYS');
  console.log('====================================================\n');

  const ts = Date.now();
  const userAEmail = `e2e-user-a-${ts}@pawnest.example`;
  const userBEmail = `e2e-user-b-${ts}@pawnest.example`;
  const password = 'StrongPassword123!';

  // ====================================================
  // JOURNEY 1: Sign Up, Sign In, and Sign Out
  // ====================================================
  console.log('▶ [Journey 1/9] Sign Up, Sign In & Sign Out...');
  const regRes = await fetchJson(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email: userAEmail, password, name: 'Maya E2E' }),
  });
  assert.strictEqual(regRes.status, 201, `Sign up failed: ${JSON.stringify(regRes.data)}`);
  assert.ok(regRes.data.user.id, 'User ID should be returned');
  console.log(`  ✓ Registered new user: ${userAEmail}`);

  // Sign In
  const loginRes = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: userAEmail, password }),
  });
  assert.strictEqual(loginRes.status, 200, `Sign in failed: ${JSON.stringify(loginRes.data)}`);
  const sessionCookie = getCookieString(loginRes.headers);
  console.log('  ✓ Authenticated and obtained session cookie');

  // Verify session
  const meRes = await fetchJson(`${API_BASE}/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(meRes.status, 200, `GET /me failed: ${JSON.stringify(meRes.data)}`);
  assert.strictEqual(meRes.data.user.email, userAEmail);
  console.log('  ✓ Verified GET /me returns authenticated user identity');

  // Sign Out
  const logoutRes = await fetchJson(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(logoutRes.status, 200, `Logout failed: ${JSON.stringify(logoutRes.data)}`);
  console.log('  ✓ Successfully signed out and cleared session');

  // Re-login to continue journey as User A
  const reLogin = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: userAEmail, password }),
  });
  const authCookie = getCookieString(reLogin.headers);

  // ====================================================
  // JOURNEY 2: Create and Update Pet Profile
  // ====================================================
  console.log('\n▶ [Journey 2/9] Create & Update Pet Profile...');
  const petCreateRes = await fetchJson(`${API_BASE}/pets`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({
      name: 'Ziggy',
      species: 'DOG',
      breed: 'Golden Retriever',
      sex: 'MALE',
      birthDate: '2022-04-12',
      weightKg: 28.5,
      allergies: ['Chicken', 'Wheat'],
    }),
  });
  assert.strictEqual(petCreateRes.status, 201);
  const createdPet = petCreateRes.data.pet || petCreateRes.data;
  const petId = createdPet.id;
  console.log(`  ✓ Created pet profile: ${createdPet.name} (ID: ${petId})`);

  // Update Pet
  const petUpdateRes = await fetchJson(`${API_BASE}/pets/${petId}`, {
    method: 'PATCH',
    headers: { Cookie: authCookie },
    body: JSON.stringify({
      weightKg: 29.2,
      notes: 'Loves gentle grooming and organic sweet potato treats.',
    }),
  });
  assert.strictEqual(petUpdateRes.status, 200);
  const updatedPet = petUpdateRes.data.pet || petUpdateRes.data;
  assert.strictEqual(updatedPet.weightKg, 29.2);
  console.log('  ✓ Updated pet weight and care instructions');

  // Add Vaccination Records (Core dog vaccines: Rabies, DHPP, Bordetella)
  for (const vName of ['Rabies', 'DHPP', 'Bordetella']) {
    const vaccineRes = await fetchJson(`${API_BASE}/pets/${petId}/vaccinations`, {
      method: 'POST',
      headers: { Cookie: authCookie },
      body: JSON.stringify({
        name: vName,
        administeredOn: '2024-01-15',
        expiresOn: '2027-01-15',
        vetName: 'Dr. Evans',
      }),
    });
    assert.strictEqual(vaccineRes.status, 201);
  }
  console.log('  ✓ Added Rabies, DHPP, and Bordetella vaccination records expiring in 2027');

  // ====================================================
  // JOURNEY 3: Book Grooming, Boarding & Vet Appointment
  // ====================================================
  console.log('\n▶ [Journey 3/9] Booking Grooming, Boarding & Vet Stays...');
  
  // 3a. Grooming Booking
  const groomerData = await fetchJson(`${API_BASE}/providers/the-velvet-hound-groomery`);
  assert.strictEqual(groomerData.status, 200);
  const groomerProviderId = groomerData.data.provider.id;
  const groomerService = groomerData.data.services.find((s) => s.name.includes('Bath, Brush'));
  const groomerServiceId = groomerService.id;

  // Query availability engine for next available slot
  let chosenSlot = null;
  for (let dayOffset = 3; dayOffset <= 25; dayOffset++) {
    const checkDate = new Date(Date.now() + 86400000 * dayOffset).toISOString().split('T')[0];
    const availRes = await fetchJson(`${API_BASE}/providers/the-velvet-hound-groomery/availability?serviceId=${groomerServiceId}&date=${checkDate}`);
    if (availRes.status === 200 && availRes.data.slots && availRes.data.slots.length > 0) {
      const openSlot = availRes.data.slots.find((s) => s.remaining > 0);
      if (openSlot) {
        chosenSlot = openSlot;
        break;
      }
    }
  }
  assert.ok(chosenSlot, 'Must find an available grooming slot from availability engine');

  const grmRes = await fetchJson(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { Cookie: authCookie, 'Idempotency-Key': `idemp-grm-${ts}` },
    body: JSON.stringify({
      providerId: groomerProviderId,
      serviceId: groomerServiceId,
      petId,
      kind: 'GROOMING',
      startsAt: chosenSlot.startsAt,
      endsAt: chosenSlot.endsAt,
    }),
  });
  assert.strictEqual(grmRes.status, 201, `Grooming booking failed: ${JSON.stringify(grmRes.data)}`);
  assert.ok(grmRes.data.reference.startsWith('PN-GRM-'), 'Grooming reference prefix must be PN-GRM-');
  const groomingBookingId = grmRes.data.id;
  console.log(`  ✓ Grooming appointment booked: ${grmRes.data.reference} (${chosenSlot.startsAt.split('T')[0]})`);

  // 3b. Boarding Reservation
  const boardingData = await fetchJson(`${API_BASE}/providers/meadowbrook-canine-retreat`);
  assert.strictEqual(boardingData.status, 200);
  const boardingProviderId = boardingData.data.provider.id;
  const boardingUnitId = boardingData.data.units[0].id;

  const bndOffsetDays = 35 + Math.floor((ts % 10000) / 500);
  const checkIn = new Date(Date.now() + 86400000 * bndOffsetDays).toISOString().split('T')[0] + 'T14:00:00.000Z';
  const checkOut = new Date(Date.now() + 86400000 * (bndOffsetDays + 2)).toISOString().split('T')[0] + 'T11:00:00.000Z';

  const bndRes = await fetchJson(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { Cookie: authCookie, 'Idempotency-Key': `idemp-bnd-${ts}` },
    body: JSON.stringify({
      providerId: boardingProviderId,
      boardingUnitId,
      petId,
      kind: 'BOARDING',
      startsAt: checkIn,
      endsAt: checkOut,
      careInstructions: {
        feeding: '2 cups wholesome kibble twice daily',
        medications: 'None',
        emergencyContact: 'Maya: 555-0100',
      },
    }),
  });
  assert.strictEqual(bndRes.status, 201, `Boarding booking failed: ${JSON.stringify(bndRes.data)}`);
  assert.ok(bndRes.data.reference.startsWith('PN-BND-'), 'Boarding reference prefix must be PN-BND-');
  console.log(`  ✓ Boarding retreat booked: ${bndRes.data.reference} (2 Nights)`);

  // 3c. Vet Appointment with Emergency Disclaimer
  const vetData = await fetchJson(`${API_BASE}/providers/hudson-river-vet`);
  assert.strictEqual(vetData.status, 200);
  const vetProviderId = vetData.data.provider.id;
  const vetServiceId = vetData.data.services.find((s) => s.name.includes('Wellness')).id;

  const vetOffsetDays = 20 + Math.floor((ts % 10000) / 1000);
  const vetStart = new Date(Date.now() + 86400000 * vetOffsetDays).toISOString().split('T')[0] + 'T10:00:00.000Z';
  const vetEnd = new Date(Date.now() + 86400000 * vetOffsetDays).toISOString().split('T')[0] + 'T11:00:00.000Z';

  const vetRes = await fetchJson(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { Cookie: authCookie, 'Idempotency-Key': `idemp-vet-${ts}` },
    body: JSON.stringify({
      providerId: vetProviderId,
      serviceId: vetServiceId,
      petId,
      kind: 'VET',
      startsAt: vetStart,
      endsAt: vetEnd,
      visitType: 'WELLNESS',
      emergencyAcknowledged: true,
      reason: 'Annual routine wellness examination',
    }),
  });
  assert.strictEqual(vetRes.status, 201, `Vet booking failed: ${JSON.stringify(vetRes.data)}`);
  assert.ok(vetRes.data.reference.startsWith('PN-VET-'), 'Vet reference prefix must be PN-VET-');
  console.log(`  ✓ Veterinary wellness consultation booked: ${vetRes.data.reference}`);

  // ====================================================
  // JOURNEY 4: Supplies Cart & Pricing Drift
  // ====================================================
  console.log('\n▶ [Journey 4/9] Supplies Cart & Pricing Verification...');
  const productsRes = await fetchJson(`${API_BASE}/products`);
  assert.strictEqual(productsRes.status, 200);
  let sampleProduct = null;
  let sampleVariant = null;
  for (const p of productsRes.data.products) {
    const prodDetail = await fetchJson(`${API_BASE}/products/${p.slug}`);
    const v = prodDetail.data?.product?.variants?.find((item) => (item.stock - item.reserved) >= 2);
    if (v) {
      sampleProduct = p;
      sampleVariant = v;
      break;
    }
  }
  assert.ok(sampleProduct && sampleVariant, 'Must find in-stock product');

  const addToCartRes = await fetchJson(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({ variantId: sampleVariant.id, quantity: 2 }),
  });
  assert.strictEqual(addToCartRes.status, 200);
  console.log(`  ✓ Added 2x ${sampleProduct.name} to cart`);

  const cartRes = await fetchJson(`${API_BASE}/cart`, {
    headers: { Cookie: authCookie },
  });
  assert.strictEqual(cartRes.status, 200);
  const cartData = cartRes.data.cart || cartRes.data;
  assert.strictEqual(cartData.items.length, 1);
  console.log(`  ✓ Cart verified: subtotal $${(cartData.subtotalCents / 100).toFixed(2)}, total $${(cartData.totalCents / 100).toFixed(2)}`);

  // ====================================================
  // JOURNEY 5: Clearly Labelled Demo Checkout & Orders
  // ====================================================
  console.log('\n▶ [Journey 5/9] Demo Checkout & Order History...');
  const checkoutSessionRes = await fetchJson(`${API_BASE}/checkout/session`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({
      paymentMode: 'DEMO',
      shippingAddress: {
        recipient: 'Maya E2E',
        line1: '123 Test Street',
        city: 'Brooklyn',
        region: 'NY',
        postalCode: '11201',
        country: 'US',
      },
    }),
  });
  assert.strictEqual(checkoutSessionRes.status, 200);
  const demoToken = checkoutSessionRes.data.session.demoToken;
  console.log(`  ✓ Stock reserved: orderNumber ${checkoutSessionRes.data.session.orderNumber}`);

  // Confirm demo order
  const confirmOrderRes = await fetchJson(`${API_BASE}/checkout/demo/confirm`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({ demoToken }),
  });
  assert.strictEqual(confirmOrderRes.status, 200);
  const order = confirmOrderRes.data.order;
  assert.strictEqual(order.status, 'DEMO_PLACED', 'Order status must be DEMO_PLACED');
  assert.strictEqual(order.paymentMode, 'DEMO', 'Payment mode must be DEMO');
  assert.ok(order.number.startsWith('PN-ORD-'), 'Order number must start with PN-ORD-');
  console.log(`  ✓ Placed demo order: ${order.number} (Status: ${order.status}, Payment: ${order.paymentMode})`);

  // Check order history
  const ordersListRes = await fetchJson(`${API_BASE}/orders`, {
    headers: { Cookie: authCookie },
  });
  assert.strictEqual(ordersListRes.status, 200);
  assert.ok(ordersListRes.data.orders.some((o) => o.id === order.id));
  console.log('  ✓ Order verified in customer order history');

  // ====================================================
  // JOURNEY 6: Save and Remove Favourites
  // ====================================================
  console.log('\n▶ [Journey 6/9] Favourites Persistence & Management...');
  const favToggleRes = await fetchJson(`${API_BASE}/me/favourites`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({ kind: 'PROVIDER', id: groomerProviderId }),
  });
  assert.strictEqual(favToggleRes.status, 201);
  assert.strictEqual(favToggleRes.data.isFavourited, true);
  console.log('  ✓ Toggled Velvet Hound Groomery as favourite');

  const getFavsRes = await fetchJson(`${API_BASE}/me/favourites`, {
    headers: { Cookie: authCookie },
  });
  assert.strictEqual(getFavsRes.status, 200);
  assert.ok(getFavsRes.data.favourites.some((f) => f.provider?.id === groomerProviderId));
  console.log('  ✓ Verified favourite persisted in GET /me/favourites');

  // Remove favourite
  const delFavRes = await fetchJson(`${API_BASE}/me/favourites/PROVIDER/${groomerProviderId}`, {
    method: 'DELETE',
    headers: { Cookie: authCookie },
  });
  assert.strictEqual(delFavRes.status, 200);
  console.log('  ✓ Removed favourite via DELETE endpoint');

  // ====================================================
  // JOURNEY 7: Notification Centre & Mark Read
  // ====================================================
  console.log('\n▶ [Journey 7/9] Notification Centre & Read Tracking...');
  const notifsRes = await fetchJson(`${API_BASE}/notifications`, {
    headers: { Cookie: authCookie },
  });
  assert.strictEqual(notifsRes.status, 200);
  console.log(`  ✓ Notifications retrieved (count: ${notifsRes.data.items.length}, unread: ${notifsRes.data.unreadCount})`);

  // Mark all read
  const markAllRes = await fetchJson(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    headers: { Cookie: authCookie },
  });
  assert.strictEqual(markAllRes.status, 200);
  console.log('  ✓ All notifications marked as read atomically');

  // ====================================================
  // JOURNEY 8: Review Submission Eligibility
  // ====================================================
  console.log('\n▶ [Journey 8/9] Review Submission Eligibility Enforcement...');
  
  // 8a. Attempt review on non-completed booking (should fail with 422)
  const failReviewRes = await fetchJson(`${API_BASE}/providers/the-velvet-hound-groomery/reviews`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({
      bookingId: groomingBookingId,
      rating: 5,
      title: 'Premature review',
      body: 'Trying to review before appointment occurred.',
    }),
  });
  assert.strictEqual(failReviewRes.status, 422, 'Non-completed booking must be rejected with 422');
  assert.strictEqual(failReviewRes.data.code, 'VALIDATION_FAILED');
  console.log('  ✓ Successfully rejected review on non-completed appointment with 422 VALIDATION_FAILED');

  // 8b. Progress booking to COMPLETED via admin status route
  const adminLogin = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@pawnest.example', password: 'AdminSecret2026!' }),
  });
  const adminCookie = getCookieString(adminLogin.headers);

  const adminCompleteRes = await fetchJson(`${API_BASE}/admin/bookings/${groomingBookingId}/status`, {
    method: 'PATCH',
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  assert.strictEqual(adminCompleteRes.status, 200);
  console.log('  ✓ Booking advanced to COMPLETED status');

  // 8c. Submit valid review on completed booking
  const validReviewRes = await fetchJson(`${API_BASE}/providers/the-velvet-hound-groomery/reviews`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({
      bookingId: groomingBookingId,
      rating: 5,
      title: 'Gentle coat styling and serene atmosphere',
      body: 'Ziggy felt completely at home during his bath and de-shedding.',
    }),
  });
  assert.strictEqual(validReviewRes.status, 201);
  console.log('  ✓ Successfully submitted verified review for completed booking');

  // 8d. Attempt duplicate review on same booking (should fail with 409)
  const dupReviewRes = await fetchJson(`${API_BASE}/providers/the-velvet-hound-groomery/reviews`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: JSON.stringify({
      bookingId: groomingBookingId,
      rating: 4,
      title: 'Second review attempt',
      body: 'Should not allow a second review for the same visit.',
    }),
  });
  assert.strictEqual(dupReviewRes.status, 409, 'Duplicate review must be rejected with 409');
  assert.strictEqual(dupReviewRes.data.code, 'CONFLICT');
  console.log('  ✓ Successfully rejected duplicate review with 409 CONFLICT');

  // ====================================================
  // JOURNEY 9: Security Isolation & Cross-User Privacy
  // ====================================================
  console.log('\n▶ [Journey 9/9] Security Isolation & Cross-User Protection...');
  
  // Register Customer B
  const regB = await fetchJson(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email: userBEmail, password, name: 'Daniel Intruder' }),
  });
  const loginB = await fetchJson(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: userBEmail, password }),
  });
  const cookieB = getCookieString(loginB.headers);

  // User B attempts to access User A's pet
  const bAccessPet = await fetchJson(`${API_BASE}/pets/${petId}`, {
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(bAccessPet.status, 404, 'Foreign pet profile must return 404 Not Found');
  console.log("  ✓ Customer B blocked from viewing Customer A's pet (404 Not Found)");

  // User B attempts to access User A's booking
  const bAccessBooking = await fetchJson(`${API_BASE}/bookings/${groomingBookingId}`, {
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(bAccessBooking.status, 404, 'Foreign booking must return 404 Not Found');
  console.log("  ✓ Customer B blocked from viewing Customer A's booking (404 Not Found)");

  // User B attempts to access User A's order
  const bAccessOrder = await fetchJson(`${API_BASE}/orders/${order.id}`, {
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(bAccessOrder.status, 404, 'Foreign order must return 404 Not Found');
  console.log("  ✓ Customer B blocked from viewing Customer A's order (404 Not Found)");

  // User B attempts to review User A's booking
  const bReviewForeign = await fetchJson(`${API_BASE}/providers/the-velvet-hound-groomery/reviews`, {
    method: 'POST',
    headers: { Cookie: cookieB },
    body: JSON.stringify({
      bookingId: groomingBookingId,
      rating: 1,
      title: 'Malicious review',
      body: 'I do not own this booking.',
    }),
  });
  assert.strictEqual(bReviewForeign.status, 404, 'Foreign booking review must return 404 Not Found');
  console.log("  ✓ Customer B blocked from reviewing Customer A's booking (404 Not Found)");

  console.log('\n====================================================');
  console.log('🎉 ALL 9 END-TO-END CUSTOMER JOURNEYS PASSED CLEANLY!');
  console.log('====================================================\n');
}

runAllJourneys().catch((err) => {
  console.error('\n❌ E2E Journey Failure:', err);
  process.exit(1);
});
