const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ============================================
// FUNCIÓN HELPER PARA OBTENER STRIPE
// ============================================
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY no está configurada');
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// ============================================
// MAPEO DE PLANES A PRICE IDS
// ============================================
const PRICE_IDS = {
  // ADOPCIÓN (Mensual)
  adopcion: {
    '5': 'price_1SedOV5AM2wN9Wkr1cI7t1oq',
    '10': 'price_1SedPU5AM2wN9WkrdlaM1nxd',
    '20': 'price_1SedPU5AM2wN9WkrhLRT3r7y',
  },
  // SUSCRIPCIÓN (Mensual)
  suscripcion: {
    '5': 'price_1SedQC5AM2wN9Wkroe5eXGXo',
    '10': 'price_1SedR75AM2wN9WkrAs7zQ5Zg',
    '60': 'price_1SedR75AM2wN9Wkrjzauq7Zi',
    '150': 'price_1SedR75AM2wN9WkrbpGEyZyc',
  },
};

// ============================================
// APOYO - PAGO ÚNICO
// ============================================
exports.createApoyoPayment = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  const { amount } = req.body;

  // Validar monto
  if (!amount || amount < 1) {
    return next(new AppError('El monto mínimo es $1 USD', 400));
  }

  // Crear Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convertir a centavos
    currency: 'usd',
    description: `Apoyo a WooHeart - $${amount} USD`,
    metadata: {
      userId: req.user._id.toString(),
      type: 'apoyo',
      amount: amount.toString(),
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    },
  });
});

// ============================================
// SUSCRIPCIÓN - PAGO MENSUAL
// ============================================
exports.createSuscripcionPayment = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  const { plan } = req.body;

  console.log('📦 Request recibido:', { plan, userId: req.user._id });

  // Validar plan
  if (!plan || !PRICE_IDS.suscripcion[plan]) {
    return next(
      new AppError('Plan inválido. Opciones: 5, 10, 60, 150', 400)
    );
  }

  const priceId = PRICE_IDS.suscripcion[plan];
  const amount = parseInt(plan);
  console.log('💳 Price ID seleccionado:', priceId, '- Monto:', amount);

  // Buscar o crear cliente en Stripe
  let customer;
  const existingCustomers = await stripe.customers.list({
    email: req.user.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0];
    console.log('✅ Cliente existente encontrado:', customer.id);
  } else {
    customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.name,
      metadata: {
        userId: req.user._id.toString(),
      },
    });
    console.log('✨ Nuevo cliente creado:', customer.id);
  }

  // ✅ SOLUCIÓN: Crear Payment Intent MANUAL para el primer pago
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convertir a centavos
    currency: 'usd',
    customer: customer.id,
    description: `Suscripción WooHeart - Plan ${amount}/mes`,
    metadata: {
      userId: req.user._id.toString(),
      type: 'suscripcion',
      plan,
      priceId: priceId,
    },
    automatic_payment_methods: {
      enabled: true,
    },
    setup_future_usage: 'off_session', // Guardar método de pago para futuros cobros
  });

  console.log('💰 Payment Intent creado:', paymentIntent.id);
  console.log('✅ Client Secret:', paymentIntent.client_secret.substring(0, 20) + '...');

  // Crear la suscripción en estado "incomplete" (se activará después del primer pago)
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    metadata: {
      userId: req.user._id.toString(),
      type: 'suscripcion',
      plan,
      initialPaymentIntentId: paymentIntent.id,
    },
  });

  console.log('🎉 Suscripción creada:', subscription.id, '- Status:', subscription.status);

  res.status(200).json({
    status: 'success',
    data: {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
      paymentIntentId: paymentIntent.id,
    },
  });
});

// ============================================
// ADOPCIÓN - PAGO MENSUAL
// ============================================
exports.createAdopcionPayment = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  const { plan, petId } = req.body;

  console.log('📦 Request recibido:', { plan, petId, userId: req.user._id });

  // Validar plan
  if (!plan || !PRICE_IDS.adopcion[plan]) {
    return next(new AppError('Plan inválido. Opciones: 5, 10, 20', 400));
  }

  const priceId = PRICE_IDS.adopcion[plan];
  const amount = parseInt(plan);
  console.log('💳 Price ID seleccionado:', priceId, '- Monto:', amount);

  // Buscar o crear cliente en Stripe
  let customer;
  const existingCustomers = await stripe.customers.list({
    email: req.user.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    customer = existingCustomers.data[0];
    console.log('✅ Cliente existente encontrado:', customer.id);
  } else {
    customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.name,
      metadata: {
        userId: req.user._id.toString(),
      },
    });
    console.log('✨ Nuevo cliente creado:', customer.id);
  }

  // ✅ SOLUCIÓN: Crear Payment Intent MANUAL para el primer pago
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convertir a centavos
    currency: 'usd',
    customer: customer.id,
    description: `Adopción WooHeart - Plan ${amount}/mes${petId ? ` - Pet: ${petId}` : ''}`,
    metadata: {
      userId: req.user._id.toString(),
      type: 'adopcion',
      plan,
      priceId: priceId,
      ...(petId && { petId }),
    },
    automatic_payment_methods: {
      enabled: true,
    },
    setup_future_usage: 'off_session', // Guardar método de pago para futuros cobros
  });

  console.log('💰 Payment Intent creado:', paymentIntent.id);
  console.log('✅ Client Secret:', paymentIntent.client_secret.substring(0, 20) + '...');

  // Crear la suscripción en estado "incomplete" (se activará después del primer pago)
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    metadata: {
      userId: req.user._id.toString(),
      type: 'adopcion',
      plan,
      initialPaymentIntentId: paymentIntent.id,
      ...(petId && { petId }),
    },
  });

  console.log('🎉 Suscripción creada:', subscription.id, '- Status:', subscription.status);

  res.status(200).json({
    status: 'success',
    data: {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
      paymentIntentId: paymentIntent.id,
    },
  });
});

// ============================================
// WEBHOOK DE STRIPE
// ============================================
exports.handleStripeWebhook = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️ Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar eventos
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('✅ Pago exitoso:', paymentIntent.id);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('✅ Suscripción pagada:', invoice.subscription);
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('❌ Suscripción cancelada:', subscription.id);
      break;

    default:
      console.log(`⚠️ Evento no manejado: ${event.type}`);
  }

  res.json({ received: true });
});

// ============================================
// OBTENER MIS PAGOS
// ============================================
exports.getMyPayments = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  const charges = await stripe.charges.list({
    limit: 50,
  });

  const userCharges = charges.data.filter(
    (charge) => charge.metadata.userId === req.user._id.toString()
  );

  res.status(200).json({
    status: 'success',
    results: userCharges.length,
    data: {
      payments: userCharges,
    },
  });
});

// ============================================
// OBTENER MIS SUSCRIPCIONES
// ============================================
exports.getMySubscriptions = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  
  // Buscar customer del usuario
  const customers = await stripe.customers.list({
    email: req.user.email,
    limit: 1,
  });

  if (customers.data.length === 0) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: {
        subscriptions: [],
      },
    });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    limit: 50,
  });

  res.status(200).json({
    status: 'success',
    results: subscriptions.data.length,
    data: {
      subscriptions: subscriptions.data,
    },
  });
});

// ============================================
// CANCELAR SUSCRIPCIÓN
// ============================================
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  const { subscriptionId } = req.params;

  const subscription = await stripe.subscriptions.cancel(subscriptionId);

  res.status(200).json({
    status: 'success',
    message: 'Suscripción cancelada exitosamente',
    data: {
      subscription,
    },
  });
});