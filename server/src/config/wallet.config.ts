export default {
  // المفتاح الخاص للمحفظة الرئيسية
  masterPrivateKey: process.env.MASTER_PRIVATE_KEY || '',
  masterAddress: process.env.MASTER_ADDRESS || '',
  
  // BSC (BEP20)
  masterBscPrivateKey: process.env.MASTER_BSC_PRIVATE_KEY || '',
  masterBscAddress: process.env.MASTER_BSC_ADDRESS || '',
  
  // إعدادات Tron
  tronProvider: process.env.TRON_PROVIDER || 'https://api.trongrid.io',
  tronApiKey: process.env.TRON_API_KEY || '',
  
  // إعدادات BSC
  bscProvider: process.env.BSC_PROVIDER || 'https://bsc-dataseed.binance.org',
  bscScanApiKey: process.env.BSCSCAN_API_KEY || '',
  
  // استخدام Testnet
  useTestnet: process.env.USE_TESTNET === 'true',
  testnetUrl: 'https://api.shasta.trongrid.io',
  bscTestnetUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
  
  // عناوين العقود
  usdtContractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  bscUsdtContractAddress: '0x55d398326f99059fF775485246999027B3197955',
  
  // المهلات
  sellerDepositTimeout: (parseInt(process.env.SELLER_DEPOSIT_TIMEOUT || '30') || 30) * 60 * 1000,
  buyerPaymentTimeout: (parseInt(process.env.BUYER_PAYMENT_TIMEOUT || '30') || 30) * 60 * 1000,
  
  // عمولة المنصة
  platformFeePercent: 1,
  
  // ❌ تم إزالة القيم الافتراضية لرسوم الشبكة
};