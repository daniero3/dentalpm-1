const { User } = require('./models');

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    const users = await User.findAll({
      attributes: ['username', 'email', 'role']
    });
    
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - ${user.email}`);
    });
    
    // Test password verification
    const testUser = await User.findOne({ where: { username: 'dr_rakoto' } });
    if (testUser) {
      const isValid = await testUser.validatePassword('dentist123');
      console.log(`\nPassword test for dr_rakoto: ${isValid ? 'VALID' : 'INVALID'}`);
    } else {
      console.log('\nUser dr_rakoto not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Database test error:', error);
    process.exit(1);
  }
}

testDB();