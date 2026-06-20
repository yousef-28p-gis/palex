const TronWeb = require('tronweb');

async function generateMasterWallet() {
  console.log('\n========================================');
  console.log('🔐 إنشاء المحفظة الرئيسية للمنصة');
  console.log('========================================\n');

  // إنشاء محفظة مباشرة باستخدام TronWeb
  const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
  const account = await tronWeb.createAccount();
  
  console.log('🏦 المحفظة الرئيسية (Master Wallet):');
  console.log('العنوان:', account.address);
  console.log('المفتاح الخاص:', account.privateKey);
  console.log('المفتاح العام:', account.publicKey);
  console.log('');

  console.log('========================================');
  console.log('⚠️  تحذيرات أمنية مهمة:');
  console.log('========================================');
  console.log('1. احفظ المفتاح الخاص في مكان آمن جداً');
  console.log('2. لا تخزن المفتاح الخاص في قاعدة البيانات بدون تشفير');
  console.log('3. انسخ هذه المعلومات الآن وأغلق هذا الملف');
  console.log('========================================\n');
  
  console.log('📋 ملخص للتخزين في ملف .env:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`MASTER_PRIVATE_KEY=${account.privateKey}`);
  console.log(`MASTER_ADDRESS=${account.address}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

generateMasterWallet().catch(console.error);