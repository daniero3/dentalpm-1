const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const clinicId = '11111111-1111-4111-8111-111111111111';
const userId = '99999999-9999-4999-8999-999999999999';

function buildAuthApp() {
  jest.resetModules();

  const models = {
    Clinic: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn()
    },
    User: {
      findOne: jest.fn(),
      create: jest.fn()
    },
    Subscription: {
      create: jest.fn()
    },
    AuditLog: {
      create: jest.fn().mockResolvedValue({})
    }
  };

  jest.doMock('../models', () => models);
  jest.doMock('../utils/mailer', () => ({
    sendWelcomeTrial: jest.fn().mockResolvedValue()
  }));

  const authRouter = require('../routes/auth');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  return { app, models };
}

function buildBillingApp(stripeMock) {
  jest.resetModules();

  const models = {
    Clinic: {
      findByPk: jest.fn(),
      update: jest.fn().mockResolvedValue([1]),
      findOne: jest.fn(),
      count: jest.fn()
    },
    Subscription: {
      update: jest.fn().mockResolvedValue([1]),
      create: jest.fn().mockResolvedValue({ id: 'sub_new' }),
      findOne: jest.fn(),
      findAll: jest.fn()
    },
    PaymentRequest: {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    AuditLog: {
      create: jest.fn().mockResolvedValue({})
    }
  };

  jest.doMock('../models', () => models);
  jest.doMock('stripe', () => jest.fn(() => stripeMock));
  jest.doMock('../job/subscriptionManager', () => ({
    activateSubscriptionAfterPayment: jest.fn().mockResolvedValue({ success: true })
  }));
  jest.doMock('../utils/mailer', () => ({
    sendWelcomeTrial: jest.fn().mockResolvedValue(),
    sendSubscriptionActivated: jest.fn().mockResolvedValue(),
    sendTrialReminder: jest.fn().mockResolvedValue()
  }));

  jest.spyOn(global, 'setInterval').mockImplementation(() => 1);
  jest.spyOn(global, 'clearInterval').mockImplementation(() => {});

  const billingRouter = require('../routes/billing');

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && process.env.JWT_SECRET) {
      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {}
    }
    next();
  });
  app.use('/api/billing', billingRouter);
  return { app, models };
}

describe('subscription trial flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.dontMock('../models');
    jest.dontMock('../utils/mailer');
    jest.dontMock('stripe');
    jest.dontMock('../job/subscriptionManager');
    if (global.setInterval.mockRestore) global.setInterval.mockRestore();
    if (global.clearInterval.mockRestore) global.clearInterval.mockRestore();
  });

  test('creates a cabinet with a pending subscription before Stripe checkout', async () => {
    const { app, models } = buildAuthApp();
    const existingClinic = null;
    models.Clinic.findOne.mockResolvedValue(existingClinic);
    models.Clinic.create.mockResolvedValue({ id: clinicId, name: 'Cabinet Test', email: 'test@cabinet.mg' });
    models.User.findOne.mockResolvedValue(null);
    models.User.create.mockResolvedValue({
      id: userId,
      username: 'dr_test',
      full_name: 'Jean Rakoto',
      email: 'test@cabinet.mg'
    });
    models.Subscription.create.mockResolvedValue({ id: 'sub_trial' });

    const res = await request(app)
      .post('/api/auth/register-clinic')
      .send({
        cabinet: 'Cabinet Test',
        practitioner_identifier: 'dr_test',
        first_name: 'Jean',
        last_name: 'Rakoto',
        email: 'test@cabinet.mg',
        phone: '0340000000',
        city: 'Antananarivo',
        password: 'StrongPass1!',
        plan: 'PRO'
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Carte requise pour activer l’essai de 30 jours/i);
    expect(models.Clinic.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Cabinet Test',
      email: 'test@cabinet.mg',
      subscription_status: 'PENDING',
      current_plan: 'PRO',
      is_active: false
    }));
    expect(models.User.create).toHaveBeenCalledWith(expect.objectContaining({
      username: 'dr_test',
      email: 'test@cabinet.mg',
      full_name: 'Jean Rakoto',
      role: 'ADMIN',
      clinic_id: clinicId,
      password_hash: 'StrongPass1!'
    }));
    expect(res.body.admin_user).toEqual(expect.objectContaining({
      username: 'dr_test',
      full_name: 'Jean Rakoto',
      email: 'test@cabinet.mg'
    }));
    expect(res.body.temp_password).toBeUndefined();
    expect(models.Subscription.create).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicId,
      plan: 'PRO',
      status: 'PENDING',
      billing_cycle: 'MONTHLY'
    }));

    const createdSub = models.Subscription.create.mock.calls[0][0];
    const diffDays = Math.round((new Date(createdSub.end_date) - new Date(createdSub.start_date)) / 86400000);
    expect(diffDays).toBe(30);
  });

  test('blocks login when the clinic subscription is cancelled', async () => {
    process.env.JWT_SECRET = 'jwt_test_secret';
    const { app, models } = buildAuthApp();
    const user = {
      id: userId,
      username: 'dr_test',
      email: 'test@cabinet.mg',
      full_name: 'Jean Rakoto',
      role: 'ADMIN',
      clinic_id: clinicId,
      is_active: true,
      validatePassword: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue()
    };

    models.User.findOne.mockResolvedValue(user);
    models.Clinic.findByPk.mockResolvedValue({
      id: clinicId,
      name: 'Cabinet Test',
      is_active: false,
      subscription_status: 'CANCELLED',
      current_plan: 'PRO'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dr_test', password: 'ValidPassword1!' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SUBSCRIPTION_INACTIVE');
    expect(user.update).not.toHaveBeenCalled();
  });

  test('creates a Stripe checkout session with a 30-day trial', async () => {
    const stripeMock = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123'
          })
        }
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    };

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    const { app, models } = buildBillingApp(stripeMock);
    models.Clinic.findByPk.mockResolvedValue({
      id: clinicId,
      name: 'Cabinet Test',
      email: 'test@cabinet.mg',
      stripe_customer_id: 'cus_test_123'
    });

    const res = await request(app)
      .post('/api/billing/public-checkout')
      .send({ plan_code: 'PRO', clinic_id: clinicId, email: 'test@cabinet.mg' });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      payment_method_types: ['card'],
      subscription_data: expect.objectContaining({
        trial_period_days: 30,
        metadata: expect.objectContaining({ plan: 'PRO', clinic_id: clinicId })
      }),
      metadata: expect.objectContaining({ plan: 'PRO', clinic_id: clinicId }),
      customer: 'cus_test_123',
      success_url: expect.stringContaining('session_id={CHECKOUT_SESSION_ID}')
    }));
  });

  test('recreates a missing Stripe customer before opening the customer portal', async () => {
    const stripeMock = {
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_recreated_123' })
      },
      billingPortal: {
        sessions: {
          create: jest.fn()
            .mockRejectedValueOnce({
              code: 'resource_missing',
              param: 'customer',
              message: "No such customer: 'cus_deleted_123'"
            })
            .mockResolvedValueOnce({
              url: 'https://billing.stripe.com/session/test_123'
            })
        }
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    };

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.JWT_SECRET = 'jwt_test_secret';
    process.env.FRONTEND_URL = 'dentalpm-1-production.up.railway.app/';
    const token = jwt.sign({ userId, clinic_id: clinicId }, process.env.JWT_SECRET);
    const { app, models } = buildBillingApp(stripeMock);
    const clinic = {
      id: clinicId,
      name: 'Cabinet Test',
      email: 'test@cabinet.mg',
      stripe_customer_id: 'cus_deleted_123',
      update: jest.fn().mockResolvedValue()
    };
    models.Clinic.findByPk.mockResolvedValue(clinic);

    const res = await request(app)
      .post('/api/billing/customer-portal')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://billing.stripe.com/session/test_123');
    expect(stripeMock.customers.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@cabinet.mg',
      metadata: { clinic_id: clinicId }
    }));
    expect(clinic.update).toHaveBeenCalledWith({ stripe_customer_id: 'cus_recreated_123' });
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenLastCalledWith({
      customer: 'cus_recreated_123',
      return_url: 'https://dentalpm-1-production.up.railway.app/subscription?portal=returned'
    });
  });

  test('returns 503 when Stripe customer portal is not configured', async () => {
    const stripeMock = {
      customers: {
        create: jest.fn()
      },
      billingPortal: {
        sessions: {
          create: jest.fn().mockRejectedValue({
            message: 'No configuration provided and your test mode default configuration has not been created.'
          })
        }
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    };

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.JWT_SECRET = 'jwt_test_secret';
    const token = jwt.sign({ userId, clinic_id: clinicId }, process.env.JWT_SECRET);
    const { app, models } = buildBillingApp(stripeMock);
    models.Clinic.findByPk.mockResolvedValue({
      id: clinicId,
      name: 'Cabinet Test',
      email: 'test@cabinet.mg',
      stripe_customer_id: 'cus_test_123'
    });

    const res = await request(app)
      .post('/api/billing/customer-portal')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Portail client Stripe non configuré');
  });

  test('finalizes Stripe checkout and activates the trial from session_id', async () => {
    const stripeMock = {
      checkout: {
        sessions: {
          retrieve: jest.fn().mockResolvedValue({
            mode: 'subscription',
            status: 'complete',
            client_reference_id: clinicId,
            metadata: { clinic_id: clinicId, plan: 'PRO' },
            subscription: {
              id: 'sub_test_123',
              trial_end: Math.floor((Date.now() + 30 * 86400000) / 1000),
              metadata: { clinic_id: clinicId, plan: 'PRO' }
            }
          })
        }
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    };

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    const { app, models } = buildBillingApp(stripeMock);
    models.Subscription.findOne.mockResolvedValue(null);
    models.Subscription.create.mockResolvedValue({
      id: 'sub_new',
      status: 'TRIAL',
      plan: 'PRO',
      end_date: '2026-05-19'
    });

    const res = await request(app)
      .post('/api/billing/finalize-public-checkout')
      .send({ session_id: 'cs_test_123' });

    expect(res.status).toBe(200);
    expect(res.body.activated).toBe(true);
    expect(stripeMock.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test_123', {
      expand: ['subscription']
    });
    expect(models.Subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUPERSEDED' }),
      expect.objectContaining({
        where: expect.objectContaining({
          clinic_id: clinicId
        })
      })
    );
    expect(models.Subscription.create).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicId,
      plan: 'PRO',
      status: 'TRIAL',
      stripe_subscription_id: 'sub_test_123'
    }));
    expect(models.Clinic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: 'TRIAL',
        current_plan: 'PRO',
        is_active: true
      }),
      expect.objectContaining({ where: { id: clinicId } })
    );
  });

  test('activates the trial after Stripe checkout completion', async () => {
    const stripeMock = {
      checkout: {
        sessions: {
          create: jest.fn()
        }
      },
      webhooks: {
        constructEvent: jest.fn((body, sig, secret) => ({
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: { clinic_id: clinicId, plan: 'PRO' },
              subscription: 'sub_test_123'
            }
          }
        }))
      }
    };

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const { app, models } = buildBillingApp(stripeMock);

    models.Clinic.findByPk.mockResolvedValue({ id: clinicId, email: 'test@cabinet.mg', name: 'Cabinet Test' });

    const res = await request(app)
      .post('/api/billing/webhook/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(JSON.stringify({ id: 'evt_123' }));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(models.Subscription.create).toHaveBeenCalledWith(expect.objectContaining({
      clinic_id: clinicId,
      plan: 'PRO',
      status: 'TRIAL',
      stripe_subscription_id: 'sub_test_123'
    }));
    expect(models.Clinic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: 'TRIAL',
        current_plan: 'PRO',
        is_active: true
      }),
      expect.objectContaining({ where: { id: clinicId } })
    );
  });

  test('deactivates clinic access when Stripe subscription is deleted', async () => {
    const stripeMock = {
      checkout: {
        sessions: {
          create: jest.fn()
        }
      },
      webhooks: {
        constructEvent: jest.fn((body, sig, secret) => ({
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_test_123',
              metadata: { clinic_id: clinicId, plan: 'PRO' }
            }
          }
        }))
      }
    };

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const { app, models } = buildBillingApp(stripeMock);

    const res = await request(app)
      .post('/api/billing/webhook/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(JSON.stringify({ id: 'evt_123' }));

    expect(res.status).toBe(200);
    expect(models.Subscription.update).toHaveBeenCalledWith(
      { status: 'CANCELLED' },
      expect.objectContaining({
        where: expect.objectContaining({ clinic_id: clinicId })
      })
    );
    expect(models.Clinic.update).toHaveBeenCalledWith(
      { subscription_status: 'CANCELLED', is_active: false },
      { where: { id: clinicId } }
    );
  });

  test('deactivates clinic access when Stripe cancellation is scheduled', async () => {
    const stripeMock = {
      checkout: {
        sessions: {
          create: jest.fn()
        }
      },
      webhooks: {
        constructEvent: jest.fn((body, sig, secret) => ({
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_test_123',
              status: 'active',
              trial_end: null,
              cancel_at_period_end: true,
              metadata: { clinic_id: clinicId, plan: 'PRO' }
            }
          }
        }))
      }
    };

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const { app, models } = buildBillingApp(stripeMock);

    const res = await request(app)
      .post('/api/billing/webhook/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'sig_test')
      .send(JSON.stringify({ id: 'evt_123' }));

    expect(res.status).toBe(200);
    expect(models.Subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'CANCELLED',
        auto_renew: false,
        cancellation_reason: 'Annulation programmée depuis Stripe'
      }),
      expect.objectContaining({
        where: expect.objectContaining({ clinic_id: clinicId })
      })
    );
    expect(models.Clinic.update).toHaveBeenCalledWith(
      { subscription_status: 'CANCELLED', is_active: false },
      { where: { id: clinicId } }
    );
  });
});

describe('legacy short trial migration', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('tops up expired 7-day trials with 23 remaining days', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00Z'));

    const migration = require('../migrations/20260615-extend-legacy-7-day-trials');
    const queryInterface = {
      sequelize: {
        query: jest.fn().mockResolvedValue([
          {
            id: 'sub_legacy_7',
            clinic_id: clinicId,
            start_date: '2026-05-01',
            end_date: '2026-05-08',
            trial_end_date: '2026-05-08',
            notes: null
          },
          {
            id: 'sub_already_30',
            clinic_id: '22222222-2222-4222-8222-222222222222',
            start_date: '2026-05-01',
            end_date: '2026-05-31',
            trial_end_date: '2026-05-31',
            notes: null
          }
        ])
      },
      bulkUpdate: jest.fn().mockResolvedValue([1])
    };

    await migration.up(queryInterface, require('sequelize'));

    expect(queryInterface.bulkUpdate).toHaveBeenCalledTimes(2);
    expect(queryInterface.bulkUpdate).toHaveBeenNthCalledWith(
      1,
      'subscriptions',
      expect.objectContaining({
        status: 'TRIAL',
        end_date: '2026-07-08',
        trial_end_date: '2026-07-08',
        notes: expect.stringContaining('topped up by 23 days')
      }),
      { id: 'sub_legacy_7', status: 'TRIAL_EXPIRED' }
    );
    expect(queryInterface.bulkUpdate).toHaveBeenNthCalledWith(
      2,
      'clinics',
      expect.objectContaining({
        subscription_status: 'TRIAL',
        trial_ends_at: '2026-07-08',
        is_active: true
      }),
      expect.objectContaining({ id: clinicId })
    );
  });
});
