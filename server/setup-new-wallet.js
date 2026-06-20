// ===== setup-new-wallet.js =====
const TronWeb = require('tronweb');
const fs = require('fs');
const crypto = require('crypto');

async function setupNewWallet() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🔐 إنشاء محفظة TRC20 جديدة وتحديث Vault');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. إنشاء محفظة جديدة
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const account = await tronWeb.createAccount();
    
    console.log('✅ تم إنشاء محفظة جديدة:');
    console.log('   العنوان:', account.address);
    console.log('   المفتاح الخاص:', account.privateKey);
    
    // 2. حفظ المفتاح في ملف مؤقت (سيتم حذفه بعد التحديث)
    const tempVaultPath = '.temp_vault_secret';
    fs.writeFileSync(tempVaultPath, account.privateKey);
    
    console.log('\n📝 تم حفظ المفتاح المؤقت في:', tempVaultPath);
    console.log('⚠️  هذا الملف سيتم حذفه بعد 30 ثانية تلقائياً');
    
    // 3. تحديث ملف .env (للتشغيل الأول فقط)
    let envContent = '';
    try {
        envContent = fs.readFileSync('.env', 'utf8');
    } catch(e) {
        console.log('❌ ملف .env غير موجود، تأكد من وجوده أولاً');
        return;
    }
    
    // استبدال أو إضافة MASTER_PRIVATE_KEY الجديد
    if (envContent.includes('MASTER_PRIVATE_KEY=')) {
        envContent = envContent.replace(/MASTER_PRIVATE_KEY=.*/g, `MASTER_PRIVATE_KEY=${account.privateKey}`);
    } else {
        envContent += `\nMASTER_PRIVATE_KEY=${account.privateKey}`;
    }
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ تم تحديث MASTER_PRIVATE_KEY في ملف .env');
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 تم إعداد المحفظة الجديدة بنجاح!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📍 احفظ هذه المعلومات في مكان آمن:');
    console.log('   العنوان:', account.address);
    console.log('   المفتاح الخاص:', account.privateKey);
    console.log('\n🚀 الآن يمكنك تشغيل التطبيق: npm run start:dev');
    
    // حذف الملف المؤقت بعد 30 ثانية
    setTimeout(() => {
        if (fs.existsSync(tempVaultPath)) {
            fs.unlinkSync(tempVaultPath);
            console.log('🗑️  تم حذف الملف المؤقت تلقائياً');
        }
    }, 30000);
}

setupNewWallet().catch(console.error);