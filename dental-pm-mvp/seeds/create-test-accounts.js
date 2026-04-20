require('dotenv').config({ path: '../.env' });
const path = require('path');
// Charger les modèles depuis le bon répertoire
process.chdir(path.join(__dirname, '..'));
const { sequelize, User, Clinic, Subscription } = require('../models');

const ACCOUNTS = [
  {
    clinic: { name:'Cabinet Test ESSENTIAL', email:'essential@dentalpm-test.mg', phone:'034 00 000 01', city:'Antananarivo' },
    user:   { username:'test_essential', email:'essential@dentalpm-test.mg', password:'DentalPM2026!', full_name:'Admin Essential', role:'ADMIN' },
    plan: 'ESSENTIAL',
  },
  {
    clinic: { name:'Cabinet Test PRO', email:'pro@dentalpm-test.mg', phone:'034 00 000 02', city:'Antananarivo' },
    user:   { username:'test_pro', email:'pro@dentalpm-test.mg', password:'DentalPM2026!', full_name:'Admin Pro', role:'ADMIN' },
    plan: 'PRO',
  },
  {
    clinic: { name:'Cabinet Test GROUP', email:'group@dentalpm-test.mg', phone:'034 00 000 03', city:'Antananarivo' },
    user:   { username:'test_group', email:'group@dentalpm-test.mg', password:'DentalPM2026!', full_name:'Admin Group', role:'ADMIN' },
    plan: 'GROUP',
  },
];

const PLAN_PRICES = { ESSENTIAL:149000, PRO:199000, GROUP:299000 };
const PLAN_USERS  = { ESSENTIAL:2, PRO:5, GROUP:50 };

async function seed() {
  await sequelize.authenticate();
  console.log('✅ DB connectée');

  for (const acc of ACCOUNTS) {
    try {
      let clinic = await Clinic.findOne({ where: { email: acc.clinic.email } });
      if (!clinic) {
        clinic = await Clinic.create({
          ...acc.clinic,
          subscription_status:'ACTIVE', current_plan:acc.plan,
          is_active:true, is_verified:true, onboarding_completed:true,
          max_users: PLAN_USERS[acc.plan],
        });
        console.log(`✅ Cabinet créé: ${clinic.name} [${clinic.id}]`);
      } else {
        await clinic.update({ subscription_status:'ACTIVE', current_plan:acc.plan });
        console.log(`✅ Cabinet existant mis à jour: ${clinic.name}`);
      }

      let user = await User.findOne({ where: { username: acc.user.username } });
      if (!user) {
        user = await User.create({
          username: acc.user.username, email: acc.user.email,
          password_hash: acc.user.password, full_name: acc.user.full_name,
          role: acc.user.role, clinic_id: clinic.id,
          is_active:true, is_verified:true, onboarding_completed:true,
        });
        console.log(`✅ User créé: ${user.username}`);
      } else {
        await user.update({ clinic_id: clinic.id, is_active:true });
        console.log(`✅ User existant: ${user.username}`);
      }

      const endDate = new Date(); endDate.setFullYear(endDate.getFullYear() + 1);
      let sub = await Subscription.findOne({ where:{ clinic_id: clinic.id } });
      if (!sub) {
        await Subscription.create({
          clinic_id:clinic.id, plan:acc.plan, status:'ACTIVE',
          start_date:new Date(), end_date:endDate,
          price_mga:PLAN_PRICES[acc.plan], max_practitioners:PLAN_USERS[acc.plan],
        });
      } else {
        await sub.update({ plan:acc.plan, status:'ACTIVE', end_date:endDate });
      }
      console.log(`✅ Abonnement ${acc.plan} OK`);

    } catch(e) { console.error(`❌ ${acc.plan}:`, e.message); }
  }

  console.log('\n══════════════════════════════════════════════');
  ACCOUNTS.forEach(a => {
    console.log(`Plan ${a.plan} → identifiant: ${a.user.username} | mdp: ${a.user.password}`);
  });
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
