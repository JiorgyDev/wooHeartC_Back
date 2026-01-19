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

  // Crear Payment Intent para el primer pago
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
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
    setup_future_usage: 'off_session',
  });

  console.log('💰 Payment Intent creado:', paymentIntent.id);

  // Crear la suscripción
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

  console.log('🎉 Suscripción creada:', subscription.id);

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

  // Crear Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: 'usd',
    customer: customer.id,
    //hola
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
    setup_future_usage: 'off_session',
  });

  console.log('💰 Payment Intent creado:', paymentIntent.id);

  // Crear la suscripción
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

  console.log('🎉 Suscripción creada:', subscription.id);

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
// ✅ WEBHOOK DE STRIPE - VERSIÓN MEJORADA
// ============================================
exports.handleStripeWebhook = catchAsync(async (req, res, next) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const User = require('../models/user');
  const Payment = require('../models/payment');
  const Subscription = require('../models/subscription');
  const Pet = require('../models/pet'); // ✅ NUEVO

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️ Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Evento recibido: ${event.type}`);

  // Manejar eventos
  switch (event.type) {
    // ============================================
    // PAGO ÚNICO EXITOSO (Donaciones/Apoyo)
    // ============================================
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('✅ Pago exitoso:', paymentIntent.id);

      const metadata = paymentIntent.metadata;

      // Si es un pago de apoyo (donación única)
      if (metadata.type === 'apoyo') {
        try {
          // Guardar en Payment
          await Payment.create({
            user: metadata.userId,
            type: 'apoyo',
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: 'succeeded',
            stripePaymentIntentId: paymentIntent.id,
            stripeCustomerId: paymentIntent.customer,
            description: `Apoyo a WooHeart - $${paymentIntent.amount / 100} USD`,
            paidAt: new Date()
          });

          // Actualizar usuario
          await User.findByIdAndUpdate(metadata.userId, {
            $push: {
              donations: {
                amount: paymentIntent.amount / 100,
                date: new Date(),
                description: `Apoyo a WooHeart - $${paymentIntent.amount / 100} USD`,
                stripePaymentIntentId: paymentIntent.id,
                status: 'succeeded'
              }
            }
          });

          // ✅ NUEVO: Incrementar contador general de apoyo
          // (Puedes usar esto para estadísticas globales)
          console.log('💝 Donación guardada para usuario:', metadata.userId);
        } catch (error) {
          console.error('❌ Error guardando donación:', error);
        }
      }
      break;

    // ============================================
    // SUSCRIPCIÓN CREADA/ACTUALIZADA
    // ============================================
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      console.log('🔄 Suscripción actualizada:', subscription.id);

      const subMetadata = subscription.metadata;
      const userId = subMetadata.userId;
      const type = subMetadata.type; // 'suscripcion' o 'adopcion'
      const plan = subMetadata.plan;
      const petId = subMetadata.petId; // Solo para adopciones

      if (!userId) {
        console.error('❌ userId no encontrado en metadata');
        break;
      }

      try {
        // ============================================
        // 1. Guardar/actualizar en modelo Subscription
        // ============================================
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          {
            user: userId,
            type: type,
            status: subscription.status,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            stripePriceId: subscription.items.data[0].price.id,
            amount: subscription.items.data[0].price.unit_amount / 100,
            currency: subscription.currency,
            currentPeriodStart: subscription.current_period_start 
              ? new Date(subscription.current_period_start * 1000) 
              : new Date(),
            currentPeriodEnd: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000) 
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            pet: petId || null, // ✅ NUEVO
            metadata: subMetadata
          },
          { upsert: true, new: true }
        );

        // ============================================
        // 2. Actualizar usuario según tipo
        // ============================================
        if (type === 'suscripcion') {
          // Suscripción general
          await User.findByIdAndUpdate(userId, {
            generalSubscription: {
              plan: plan,
              amount: subscription.items.data[0].price.unit_amount / 100,
              startDate: subscription.current_period_start 
                ? new Date(subscription.current_period_start * 1000) 
                : new Date(),
              endDate: subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000) 
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: subscription.status === 'active' ? 'active' : 'cancelled',
              stripeSubscriptionId: subscription.id
            }
          });
          console.log('✅ Suscripción general guardada');

        } else if (type === 'adopcion') {
          // ============================================
          // ✅ ADOPCIÓN DE MASCOTA - CAMBIOS CRÍTICOS
          // ============================================
          const planName = plan === '5' ? 'guardian' : plan === '10' ? 'protector' : 'angel';

          // ✅ PASO 1: Obtener datos de la mascota
          let petName = null;
          let petImage = null;

          if (petId) {
            try {
              const pet = await Pet.findById(petId).select('name imageUrls imageUrl');
              if (pet) {
                petName = pet.name;
                petImage = pet.imageUrls && pet.imageUrls.length > 0 
                  ? pet.imageUrls[0] 
                  : pet.imageUrl;

                // ✅ PASO 2: Incrementar contador de adopción en Pet
                await Pet.findByIdAndUpdate(petId, {
                  $inc: { adopcion: 1 }
                });
                console.log(`✅ Contador de adopción incrementado para ${pet.name}`);
              }
            } catch (petError) {
              console.error('❌ Error obteniendo mascota:', petError);
            }
          }

          // ✅ PASO 3: Guardar adopción con datos completos
          await User.findByIdAndUpdate(userId, {
            $push: {
              adoptions: {
                petId: petId || null,
                petName: petName, // ✅ NUEVO
                petImage: petImage, // ✅ NUEVO
                plan: planName,
                amount: subscription.items.data[0].price.unit_amount / 100,
                startDate: subscription.current_period_start 
                  ? new Date(subscription.current_period_start * 1000) 
                  : new Date(),
                endDate: subscription.current_period_end 
                  ? new Date(subscription.current_period_end * 1000) 
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: subscription.status === 'active' ? 'active' : 'cancelled',
                stripeSubscriptionId: subscription.id
              }
            }
          });

          console.log(`✅ Adopción guardada con datos completos:`, {
            petId,
            petName,
            petImage: petImage ? 'Sí' : 'No',
            plan: planName
          });
        }

        console.log('✅ Suscripción guardada para usuario:', userId);
      } catch (error) {
        console.error('❌ Error guardando suscripción:', error);
      }
      break;

    // ============================================
    // SUSCRIPCIÓN CANCELADA
    // ============================================
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      console.log('❌ Suscripción cancelada:', deletedSub.id);

      try {
        // Actualizar estado en BD
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: deletedSub.id },
          {
            status: 'canceled',
            canceledAt: new Date()
          }
        );

        // Actualizar usuario
        const subMeta = deletedSub.metadata;
        if (subMeta.userId) {
          if (subMeta.type === 'suscripcion') {
            await User.findByIdAndUpdate(subMeta.userId, {
              'generalSubscription.status': 'cancelled'
            });
          } else if (subMeta.type === 'adopcion') {
            await User.findOneAndUpdate(
              {
                _id: subMeta.userId,
                'adoptions.stripeSubscriptionId': deletedSub.id
              },
              {
                $set: { 'adoptions.$.status': 'cancelled' }
              }
            );
          }
        }

        console.log('✅ Suscripción marcada como cancelada');
      } catch (error) {
        console.error('❌ Error cancelando suscripción:', error);
      }
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

// ============================================
// ✅ OBTENER HISTORIAL COMPLETO
// ============================================
exports.getUserHistory = catchAsync(async (req, res, next) => {
  const User = require('../models/user');
  const Payment = require('../models/payment');
  const Subscription = require('../models/subscription');

  const userId = req.user._id;

  console.log('📋 Obteniendo historial para usuario:', userId);

  // 1. Obtener datos del usuario
  const user = await User.findById(userId)
    .select('adoptions donations generalSubscription')
    .populate('adoptions.petId', 'name imageUrls')
    .lean();

  // 2. Obtener pagos únicos
  const payments = await Payment.find({
    user: userId,
    status: 'succeeded'
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // 3. Obtener suscripciones activas
  const subscriptions = await Subscription.find({
    user: userId,
    status: { $in: ['active', 'past_due'] }
  })
    .populate('pet', 'name imageUrls')
    .sort({ createdAt: -1 })
    .lean();

  console.log('✅ Historial obtenido:', {
    adoptions: user?.adoptions?.length || 0,
    donations: payments.length,
    subscriptions: subscriptions.length
  });

  res.status(200).json({
    success: true,
    data: {
      adoptions: user?.adoptions || [],
      donations: payments || [],
      generalSubscription: user?.generalSubscription || null,
      activeSubscriptions: subscriptions || []
    }
  });
});

// ============================================
// ✅ OBTENER ESTADÍSTICAS
// ============================================
exports.getUserStats = catchAsync(async (req, res, next) => {
  const Payment = require('../models/payment');
  const Subscription = require('../models/subscription');
  const User = require('../models/user');

  const userId = req.user._id;

  console.log('📊 Obteniendo estadísticas para usuario:', userId);

  // 1. Total de donaciones
  const totalDonations = await Payment.getTotalDonations(userId);

  // 2. Suscripciones activas
  const activeSubscriptions = await Subscription.countDocuments({
    user: userId,
    status: 'active'
  });

  // 3. Adopciones activas
  const user = await User.findById(userId).select('adoptions');
  const activeAdoptions = user?.adoptions?.filter(
    adoption => adoption.status === 'active'
  ).length || 0;

  console.log('✅ Estadísticas:', {
    totalDonado: totalDonations.total,
    cantidadDonaciones: totalDonations.count,
    suscripcionesActivas: activeSubscriptions,
    adopcionesActivas: activeAdoptions
  });

  res.status(200).json({
    success: true,
    data: {
      totalDonated: totalDonations.total,
      donationsCount: totalDonations.count,
      activeSubscriptions,
      activeAdoptions
    }
  });
});

