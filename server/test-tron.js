// ===== FILE: test-tronscan.js =====
const axios = require('axios');

async function getTrxPrice() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT', { timeout: 5000 });
    return parseFloat(response.data.price);
  } catch (error) {
    console.log('⚠️ Binance API failed, using default 0.11');
    return 0.11;
  }
}

async function getFeeFromTronScan() {
  console.log('🔍 محاولة جلب العمولة من TronScan API...\n');
  
  try {
    // TronScan API للحصول على إحصائيات الشبكة
    const response = await axios.get('https://apilist.tronscan.org/api/transaction?limit=1', {
      params: {
        sort: '-timestamp',
        count: true,
        limit: 20
      },
      timeout: 10000
    });
    
    if (response.data?.data?.length > 0) {
      const transactions = response.data.data;
      let totalEnergy = 0;
      let validCount = 0;
      
      console.log('📊 آخر المعاملات:');
      
      for (const tx of transactions.slice(0, 10)) {
        if (tx.energy_usage) {
          const energyUsed = parseInt(tx.energy_usage);
          totalEnergy += energyUsed;
          validCount++;
          console.log(`   الطاقة: ${energyUsed}, المعاملة: ${tx.hash.substring(0, 20)}...`);
        }
      }
      
      if (validCount > 0) {
        const avgEnergy = totalEnergy / validCount;
        const trxPrice = await getTrxPrice();
        
        // حساب العمولة
        const feeInTrx = (avgEnergy * 100) / 1e6;
        const feeInUsd = feeInTrx * trxPrice;
        
        console.log(`\n📊 المتوسط:`);
        console.log(`   - متوسط الطاقة: ${Math.round(avgEnergy)}`);
        console.log(`   - سعر TRX: $${trxPrice}`);
        console.log(`   - العمولة المقدرة: $${feeInUsd.toFixed(4)} USDT`);
        
        return feeInUsd;
      }
    }
  } catch (error) {
    console.log('❌ TronScan API failed:', error.message);
  }
  return null;
}

async function getFeeFromTrongridWithRetry() {
  console.log('🔍 محاولة جلب العمولة من TronGrid مع إعادة المحاولة...\n');
  
  const addresses = [
    'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
    'TQNn6tBvJ9N9fW1M5xXzgKqXW5sXqJ5Yq',
    'TJRab4fzFmQ6xMuLnN9WqvN1vLvYxLqCzq'
  ];
  
  for (const address of addresses) {
    try {
      console.log(`📡 محاولة استخدام العنوان: ${address.substring(0, 10)}...`);
      
      const response = await axios.get(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`, {
        params: { limit: 5, only_token: true, contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.data?.data?.length > 0) {
        const transactions = response.data.data;
        let totalEnergy = 0;
        let validCount = 0;
        
        console.log(`✅ تم جلب ${transactions.length} معاملة`);
        
        for (const tx of transactions) {
          let energyUsed = 65000;
          if (tx.energy_usage) energyUsed = parseInt(tx.energy_usage);
          else if (tx.energy_usage_total) energyUsed = parseInt(tx.energy_usage_total);
          
          totalEnergy += energyUsed;
          validCount++;
        }
        
        const avgEnergy = totalEnergy / validCount;
        const trxPrice = await getTrxPrice();
        
        const feeInTrx = (avgEnergy * 100) / 1e6;
        const feeInUsd = feeInTrx * trxPrice;
        
        console.log(`\n💰 النتيجة:`);
        console.log(`   - متوسط الطاقة: ${Math.round(avgEnergy)}`);
        console.log(`   - العمولة: $${feeInUsd.toFixed(4)} USDT`);
        
        return feeInUsd;
      }
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   ⏳ Rate limit، انتظر 3 ثواني...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log(`   ❌ فشل: ${error.message}`);
      }
    }
  }
  
  return null;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 حساب عمولة TRC20 الحقيقية');
  console.log('═══════════════════════════════════════════════════\n');
  
  // المحاولة 1: TronScan
  let fee = await getFeeFromTronScan();
  
  // المحاولة 2: TronGrid مع إعادة المحاولة
  if (!fee) {
    console.log('\n🔄 تجربة المصدر البديل...\n');
    fee = await getFeeFromTrongridWithRetry();
  }
  
  // إذا فشل كل شيء
  if (!fee) {
    console.log('\n⚠️ لا يمكن جلب العمولة من الشبكة حالياً.');
    console.log('السبب: TronGrid API يمنع الطلبات من هذا الـ IP');
    console.log('الحل المؤقت: استخدام قيمة يدوية 1.3 USDT');
    fee = 1.3;
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`✅ العمولة النهائية: ${fee.toFixed(4)} USDT`);
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);