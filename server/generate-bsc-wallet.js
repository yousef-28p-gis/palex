const { ethers } = require('ethers');

async function generateBscWallet() {
  console.log('\n========================================');
  console.log('🔐 إنشاء المحفظة الثانوية (BSC - BEP20)');
  console.log('========================================\n');

  // إنشاء محفظة BSC جديدة
  const wallet = ethers.Wallet.createRandom();
  
  console.log('🏦 المحفظة الثانوية (BSC Wallet):');
  console.log('العنوان:', wallet.address);
  console.log('المفتاح الخاص:', wallet.privateKey);
  console.log('');

  console.log('========================================');
  console.log('⚠️  تحذيرات أمنية مهمة:');
  console.log('========================================');
  console.log('1. هذه محفظة مستقلة منفصلة عن محفظة TRC20');
  console.log('2. تستخدم لشبكة Binance Smart Chain (BEP20)');
  console.log('3. احفظ المفتاح الخاص في مكان آمن جداً');
  console.log('4. ستحتاج إلى شحنها بـ BNB لدفع رسوم الغاز');
  console.log('========================================\n');
  
  console.log('📋 انسخ هذا إلى ملف .env:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`MASTER_BSC_PRIVATE_KEY=${wallet.privateKey}`);
  console.log(`MASTER_BSC_ADDRESS=${wallet.address}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

generateBscWallet().catch(console.error);