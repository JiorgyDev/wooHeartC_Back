// controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/payment');
const Subscription = require('../models/Subscription');
const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ============================================
// CONFIGURACIÓN DE PRECIOS (en centavos)
// ============================================
const PRICES = {
  // Apoyo: Monto variable (mínimo $1)
  apoyo_min: 100, // $1.00 USD mínimo
  
  // Suscripciones mensuales (SuscScreen)
  suscripcion_5: 500,    // $5 USD - Granito de arena
  suscripcion_10: 1000,  // $10 USD - Luz de esperanza
  suscripcion_60: 6000,  // $60 USD - Angel de la guarda
  suscripcion_150: 15000, // $150 USD - Corazon dorado
  
  // Adopciones mensuales (CrearScreen)
  adopcion_5: 500,   // $5 USD - Plan Guardián
  adopcion_10: 1000, // $10 USD - Plan Protector
  adopcion_20: 2000  // $20 USD - Plan Ángel
};

// ============================================
// 1. APOYO ÚNICO (Donación variable)
// ============================================
exports.createApoyoPayment = catchAsync(async (req, res, next) => {
  const { amount } = req.body; // Monto en USD que envía el usuario
  const userId = req.user.id;

  // Validar monto mínimo
  if (!amount || amount < 1) {
    return next(new AppError('El monto mínimo es $1.00 USD', 400));
  }

  // Convertir a centavos
  const finalAmount = Math.round(amount * 100);

  // Buscar o crear customer en Stripe
  let customer;
  const user = await User.findById(userId);
  
  if (user.stripeCustomerId) {
    customer = await stripe.customers.retrieve(user.stripeCustomerId);
  } else {
    customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: userId.toString()
      }
    });
    
    user.stripeCustomerId = customer.id;
    await user.save({ validateBeforeSave: false });
  }

  // Crear Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: finalAmount,
    currency: 'usd',
    customer: customer.id,
    description: 'Apoyo único a WooHeart',
    metadata: {
      userId: userId.toString(),
      type: 'apoyo'
    },
    automatic_payment_methods: {
      enabled: true
    }
  });

  // Crear registro en BD
  const payment = await Payment.create({
    user: userId,
    type: 'apoyo',
    amount: finalAmount,
    currency: 'usd',
    status: 'pending',
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: customer.id,
    description: `Apoyo único de $${amount} USD`
  });

  res.status(200).json({
    status: 'success',
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      amount: finalAmount
    }
  });
});

// ============================================
// 2. SUSCRIPCIÓN MENSUAL (Planes de SuscScreen)
// ============================================
exports.createSuscripcionPayment = catchAsync(async (req, res, next) => {
  const { plan } = req.body; // plan: '5', '10', '60', '150'
  const userId = req.user.id;

  // Validar plan
  const validPlans = ['5', '10', '60', '150'];
  if (!plan || !validPlans.includes(plan)) {
    return next(new AppError('Plan inválido. Opciones: 5, 10, 60, 150', 400));
  }

  const planKey = `suscripcion_${plan}`;
  const amount = PRICES[planKey];

  // Verificar si ya tiene suscripción activa
  const existingSubscription = await Subscription.findOne({
    user: userId,
    type: 'suscripcion',
    status: 'active'
  });

  if (existingSubscription) {
    return next(new AppError('Ya tienes una suscripción activa', 400));
  }

  // Buscar o crear customer
  let customer;
  const user = await User.findById(userId);
  
  if (user.stripeCustomerId) {
    customer = await stripe.customers.retrieve(user.stripeCustomerId);
  } else {
    customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: userId.toString()
      }
    });
    
    user.stripeCustomerId = customer.id;
    await user.save({ validateBeforeSave: false });
  }

  // Crear precio en Stripe
  const price = await stripe.prices.create({
    unit_amount: amount,
    currency: 'usd',
    recurring: {
      interval: 'month'
    },
    product_data: {
      name: `Suscripción WooHeart - Plan $${plan}`,
      description: `Suscripción mensual de $${plan} USD`
    }
  });

  // Crear suscripción
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      userId: userId.toString(),
      type: 'suscripcion',
      plan: plan
    }
  });

  // Guardar en BD
  const dbSubscription = await Subscription.create({
    user: userId,
    type: 'suscripcion',
    status: 'incomplete',
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customer.id,
    stripePriceId: price.id,
    amount: amount,
    currency: 'usd',
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    metadata: {
      plan: plan
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: dbSubscription._id,
      amount: amount,
      plan: plan
    }
  });
});

// ============================================
// 3. ADOPCIÓN MENSUAL (Planes de CrearScreen)
// ============================================
exports.createAdopcionPayment = catchAsync(async (req, res, next) => {
  const { plan, petId } = req.body; // plan: '5', '10', '20'
  const userId = req.user.id;

  // Validar plan
  const validPlans = ['5', '10', '20'];
  if (!plan || !validPlans.includes(plan)) {
    return next(new AppError('Plan inválido. Opciones: 5, 10, 20', 400));
  }

  const planKey = `adopcion_${plan}`;
  const amount = PRICES[planKey];

  // Si petId es proporcionado, verificar que no tenga adopción activa
  if (petId) {
    const existingAdoption = await Subscription.findOne({
      user: userId,
      pet: petId,
      type: 'adopcion',
      status: 'active'
    });

    if (existingAdoption) {
      return next(new AppError('Ya tienes una adopción activa para esta mascota', 400));
    }
  }

  // Buscar o crear customer
  let customer;
  const user = await User.findById(userId);
  
  if (user.stripeCustomerId) {
    customer = await stripe.customers.retrieve(user.stripeCustomerId);
  } else {
    customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: userId.toString()
      }
    });
    
    user.stripeCustomerId = customer.id;
    await user.save({ validateBeforeSave: false });
  }

  // Crear precio
  const price = await stripe.prices.create({
    unit_amount: amount,
    currency: 'usd',
    recurring: {
      interval: 'month'
    },
    product_data: {
      name: `Adopción Virtual WooHeart - Plan $${plan}`,
      description: `Adopción mensual de $${plan} USD`
    }
  });

  // Crear suscripción
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: price.id }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      userId: userId.toString(),
      type: 'adopcion',
      plan: plan,
      petId: petId || 'general'
    }
  });

  // Guardar en BD
  const dbSubscription = await Subscription.create({
    user: userId,
    type: 'adopcion',
    status: 'incomplete',
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customer.id,
    stripePriceId: price.id,
    amount: amount,
    currency: 'usd',
    pet: petId || null,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    metadata: {
      plan: plan
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: dbSubscription._id,
      amount: amount,
      plan: plan,
      petId: petId || null
    }
  });
});

// ============================================
// OBTENER HISTORIAL DE PAGOS
// ============================================
exports.getMyPayments = catchAsync(async (req, res, next) => {
  const payments = await Payment.find({ user: req.user.id })
    .sort('-createdAt')
    .populate('pet', 'name images');

  res.status(200).json({
    status: 'success',
    results: payments.length,
    data: {
      payments
    }
  });
});

// ============================================
// OBTENER MIS SUSCRIPCIONES
// ============================================
exports.getMySubscriptions = catchAsync(async (req, res, next) => {
  const subscriptions = await Subscription.find({ user: req.user.id })
    .sort('-createdAt')
    .populate('pet', 'name images');

  res.status(200).json({
    status: 'success',
    results: subscriptions.length,
    data: {
      subscriptions
    }
  });
});

// ============================================
// CANCELAR SUSCRIPCIÓN
// ============================================
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;

  const subscription = await Subscription.findOne({
    _id: subscriptionId,
    user: req.user.id
  });

  if (!subscription) {
    return next(new AppError('Suscripción no encontrada', 404));
  }

  if (subscription.status === 'canceled') {
    return next(new AppError('La suscripción ya está cancelada', 400));
  }

  // Cancelar en Stripe
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true
  });

  // Actualizar en BD
  subscription.cancelAtPeriodEnd = true;
  await subscription.save();

  res.status(200).json({
    status: 'success',
    message: 'Suscripción cancelada. Se mantendrá activa hasta el final del período',
    data: {
      subscription
    }
  });
});

// ============================================
// WEBHOOK DE STRIPE
// ============================================
exports.handleStripeWebhook = catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook received:', event.type);

  // Manejar eventos
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// ============================================
// FUNCIONES AUXILIARES PARA WEBHOOKS
// ============================================
async function handlePaymentIntentSucceeded(paymentIntent) {
  const payment = await Payment.findOne({ 
    stripePaymentIntentId: paymentIntent.id 
  });

  if (payment) {
    payment.status = 'completed';
    payment.paidAt = new Date();
    await payment.save();
    console.log('✅ Payment marked as completed:', payment._id);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  const payment = await Payment.findOne({ 
    stripePaymentIntentId: paymentIntent.id 
  });

  if (payment) {
    payment.status = 'failed';
    payment.errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
    await payment.save();
    console.log('❌ Payment marked as failed:', payment._id);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription
  });

  if (subscription) {
    subscription.status = 'active';
    subscription.currentPeriodStart = new Date(invoice.period_start * 1000);
    subscription.currentPeriodEnd = new Date(invoice.period_end * 1000);
    await subscription.save();
    console.log('✅ Subscription marked as active:', subscription._id);
  }
}

async function handleSubscriptionUpdated(stripeSubscription) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id
  });

  if (subscription) {
    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    await subscription.save();
    console.log('✅ Subscription updated:', subscription._id);
  }
}

async function handleSubscriptionDeleted(stripeSubscription) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id
  });

  if (subscription) {
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    await subscription.save();
    console.log('✅ Subscription canceled:', subscription._id);
  }
}