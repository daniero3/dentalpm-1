const { Subscription, Clinic } = require('../models');

const VALID_PLANS = ['ESSENTIAL', 'PRO', 'GROUP'];
const ACTIVE_STATUSES = ['ACTIVE', 'TRIAL'];

const normalizePlan = (value) => {
  const plan = value ? String(value).toUpperCase() : null;
  return VALID_PLANS.includes(plan) ? plan : null;
};

const isUsableSubscription = (subscription, now = new Date()) => {
  if (!subscription || !ACTIVE_STATUSES.includes(subscription.status)) return false;
  if (!subscription.end_date) return true;
  return new Date(subscription.end_date) >= now;
};

async function getCurrentSubscriptionForClinic(clinicId, preferredPlan = null) {
  if (!clinicId) return null;
  const normalizedPreferredPlan = normalizePlan(preferredPlan);

  const subscriptions = await Subscription.findAll({
    where: { clinic_id: clinicId },
    order: [['created_at', 'DESC']]
  });

  return subscriptions.find(sub => isUsableSubscription(sub) && sub.plan === normalizedPreferredPlan)
    || subscriptions.find(sub => isUsableSubscription(sub))
    || subscriptions.find(sub => sub.plan === normalizedPreferredPlan)
    || subscriptions[0]
    || null;
}

async function getCurrentPlanForClinic(clinicId) {
  if (!clinicId) return { plan: null, subscription: null, clinic: null };

  const clinic = await Clinic.findByPk(clinicId, {
    attributes: ['id', 'name', 'city', 'phone', 'subscription_status', 'current_plan']
  }).catch(() => null);
  const subscription = await getCurrentSubscriptionForClinic(clinicId, clinic?.current_plan);

  const plan = normalizePlan(clinic?.current_plan) || normalizePlan(subscription?.plan);
  return { plan, subscription, clinic };
}

module.exports = {
  getCurrentSubscriptionForClinic,
  getCurrentPlanForClinic,
  isUsableSubscription,
  normalizePlan
};
