import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 بدء إعداد الأسعار الأولية...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. إضافة سعر الصرف الافتراضي
  const existingRate = await prisma.exchangeRate.findFirst();
  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: { usdToIls: 3.00 }
    });
    console.log('✅ سعر الصرف: 1 USD = 3.00 ILS');
  } else {
    console.log('⚠️ سعر الصرف موجود مسبقاً:', existingRate.usdToIls);
  }

  // 2. إضافة رسوم TRC20
  const existingTrc20 = await prisma.networkFee.findUnique({
    where: { network: 'TRC20' }
  });
  if (!existingTrc20) {
    await prisma.networkFee.create({
      data: {
        network: 'TRC20',
        feeAmount: 2.5,
        energyFee: 420,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      }
    });
    console.log('✅ رسوم TRC20: 2.5 USDT');
  } else {
    console.log('⚠️ رسوم TRC20 موجودة مسبقاً:', existingTrc20.feeAmount);
  }

  // 3. ✅ إضافة رسوم BEP20 (كانت مفقودة)
  const existingBep20 = await prisma.networkFee.findUnique({
    where: { network: 'BEP20' }
  });
  if (!existingBep20) {
    await prisma.networkFee.create({
      data: {
        network: 'BEP20',
        feeAmount: 0.5,
        energyFee: 0,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      }
    });
    console.log('✅ رسوم BEP20: 0.5 USDT');
  } else {
    console.log('⚠️ رسوم BEP20 موجودة مسبقاً:', existingBep20.feeAmount);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 تم إعداد الأسعار بنجاح!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 ملاحظة: سيتم تحديث الأسعار تلقائياً كل ساعة/دقيقتين من Backend.');
}

main()
  .catch(e => {
    console.error('\n❌ فشل الإعداد:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });