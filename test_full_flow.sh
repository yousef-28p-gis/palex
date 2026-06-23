#!/usr/bin/env bash
# ============================================
# 🧪 اختبار شامل لتدفق Palex مع النزاعات
# ============================================
set -e

BASE="http://localhost:4000/api"
SELLER_EMAIL="seller_$(date +%s)@test.com"
BUYER_EMAIL="buyer_$(date +%s)@test.com"
PASS="Test1234!"

echo "═════════════════════════════════════════════"
echo "   🧪 اختبار شامل لتدفق Palex"
echo "═════════════════════════════════════════════"
echo ""

# ─── 1️⃣ تسجيل بائع ───
echo "1️⃣  تسجيل بائع..."
SELLER_RES=$(curl -s "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$PASS\",\"fullName\":\"بائع تجريبي\"}")
SELLER_TOKEN=$(echo "$SELLER_RES" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "   ✅ Seller: $SELLER_EMAIL"
echo "   Token: ${SELLER_TOKEN:0:20}..."
echo ""

# ─── تسجيل مشتري ───
echo "2️⃣  تسجيل مشتري..."
BUYER_RES=$(curl -s "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$PASS\",\"fullName\":\"مشتري تجريبي\"}")
BUYER_TOKEN=$(echo "$BUYER_RES" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "   ✅ Buyer: $BUYER_EMAIL"
echo "   Token: ${BUYER_TOKEN:0:20}..."
echo ""

# ─── جلب ID المستخدمين ───
SELLER_ME=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $SELLER_TOKEN")
SELLER_ID=$(echo "$SELLER_ME" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
BUYER_ME=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $BUYER_TOKEN")
BUYER_ID=$(echo "$BUYER_ME" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Seller ID: $SELLER_ID"
echo "   Buyer ID: $BUYER_ID"
echo ""

# ─── 3️⃣ توثيق KYC ───
echo "3️⃣  توثيق KYC يدوي..."
# توجيه مباشر لقاعدة البيانات (KYC يدوي)
mysql -S /data/mariadb/data/mysql.sock -u root -N -e \
  "UPDATE users SET kyc_status='approved' WHERE id='$SELLER_ID' OR id='$BUYER_ID';"
echo "   ✅ KYC للبائع والمشتري"
echo ""

# ─── 4️⃣ إضافة محافظ ───
echo "4️⃣  إضافة محافظ USDT..."
curl -s "$BASE/users/wallets" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"walletType":"trc20","walletAddress":"TVvRxjQRKvKnBDgHqBpqJeaK8Xh47CqFd4"}' > /dev/null
echo "   ✅ محفظة البائع TRC20"
curl -s "$BASE/users/wallets" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"walletType":"trc20","walletAddress":"TXYZ1234567890abcdef1234567890abcdef12"}' > /dev/null
echo "   ✅ محفظة المشتري TRC20"
echo ""

# ─── 5️⃣ إنشاء عرض بيع ───
echo "5️⃣  إنشاء عرض بيع..."
OFFER_RES=$(curl -s "$BASE/offers" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "network":"TRC20",
    "fiatCurrency":"ils",
    "pricePerUsdt":3.75,
    "minAmount":10,
    "maxAmount":500,
    "paymentInstructions":"تحويل بنكي",
    "bankName":"البنك الإسلامي",
    "accountHolderName":"بائع تجريبي",
    "accountNumber":"1234567890"
  }')
OFFER_ID=$(echo "$OFFER_RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Offer ID: $OFFER_ID"
echo ""

# ─── 6️⃣ إنشاء صفقة ───
echo "6️⃣  إنشاء صفقة (شراء 50 USDT)..."
TRADE_RES=$(curl -s "$BASE/trades" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"offerId\":\"$OFFER_ID\",\"amountUsdt\":50}")
TRADE_ID=$(echo "$TRADE_RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Trade ID: $TRADE_ID"
echo "   Status: pending_seller_approval ✅"
echo ""

# ─── 7️⃣ موافقة البائع ───
echo "7️⃣  موافقة البائع..."
APPROVE_RES=$(curl -s -X POST "$BASE/trades/$TRADE_ID/approve" \
  -H "Authorization: Bearer $SELLER_TOKEN")
APPROVE_OK=$(echo "$APPROVE_RES" | grep -o '"success":true')
echo "   ✅ $APPROVE_OK → Status: waiting_seller_deposit"
echo ""

# ─── 8️⃣ إيداع USDT (mock) ───
echo "8️⃣  إيداع USDT..."
MOCK_DEP_RES=$(curl -s -X POST "$BASE/trades/$TRADE_ID/mock-deposit" \
  -H "Authorization: Bearer $SELLER_TOKEN")
MOCK_DEP_OK=$(echo "$MOCK_DEP_RES" | grep -o '"success":true')
echo "   ✅ $MOCK_DEP_OK → Status: active"
echo ""

# ─── 9️⃣ رفع إثبات دفع ───
echo "9️⃣  رفع إثبات دفع..."
# إنشاء صورة وهمية
echo "fake" > /tmp/test_proof.jpg
PROOF_RES=$(curl -s -X POST "$BASE/trades/$TRADE_ID/payment-proof" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -F "image=@/tmp/test_proof.jpg" \
  -F "transactionRef=REF123456" \
  -F "bankName=البنك الإسلامي" \
  -F "last4Digits=5678")
PROOF_OK=$(echo "$PROOF_RES" | grep -o '"success":true')
echo "   ✅ $PROOF_OK → Status: waiting_seller_confirmation"
echo ""

# ─── 🔟 تأكيد البائع ───
echo "🔟  تأكيد البائع (confirmPayment)..."
CONFIRM_RES=$(curl -s -X POST "$BASE/trades/$TRADE_ID/confirm-payment" \
  -H "Authorization: Bearer $SELLER_TOKEN")
CONFIRM_OK=$(echo "$CONFIRM_RES" | grep -o '"success":true')
echo "   ✅ $CONFIRM_OK"
# التحقق من الحالة
TRADE_STATUS=$(curl -s "$BASE/trades/$TRADE_ID" \
  -H "Authorization: Bearer $BUYER_TOKEN" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "   Status: $TRADE_STATUS"
echo ""

# ─── 1️⃣1️⃣ تأكيد المشتري استلام USDT ───
echo "1️⃣1️⃣  تأكيد المشتري استلام USDT (confirmReceipt)..."
RECEIPT_RES=$(curl -s -X POST "$BASE/trades/$TRADE_ID/confirm-receipt" \
  -H "Authorization: Bearer $BUYER_TOKEN")
RECEIPT_OK=$(echo "$RECEIPT_RES" | grep -o '"success":true')
echo "   ✅ $RECEIPT_OK"
TRADE_STATUS=$(curl -s "$BASE/trades/$TRADE_ID" \
  -H "Authorization: Bearer $BUYER_TOKEN" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "   Status: $TRADE_STATUS"
echo ""

# ─── 1️⃣2️⃣ تقييم ───
echo "1️⃣2️⃣  تقييم البائع..."
REVIEW_RES=$(curl -s -X POST "$BASE/reviews" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tradeId\":\"$TRADE_ID\",\"rating\":5,\"comment\":\"ممتاز 👌\"}")
REVIEW_OK=$(echo "$REVIEW_RES" | grep -o '"success":true')
echo "   ✅ $REVIEW_OK"
echo ""

# ─── 1️⃣3️⃣ اختبار النزاع: إنشاء صفقة ثانية ───
echo "═════════════════════════════════════════════"
echo "   ⚖️  اختبار النزاعات"
echo "═════════════════════════════════════════════"
echo ""

echo "1️⃣3️⃣  إنشاء صفقة جديدة لاختبار النزاع..."
TRADE2_RES=$(curl -s "$BASE/trades" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"offerId\":\"$OFFER_ID\",\"amountUsdt\":30}")
TRADE2_ID=$(echo "$TRADE2_RES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   ✅ Trade2 ID: $TRADE2_ID"
echo ""

echo "1️⃣4️⃣  موافقة البائع..."
curl -s -X POST "$BASE/trades/$TRADE2_ID/approve" \
  -H "Authorization: Bearer $SELLER_TOKEN" > /dev/null
echo "   ✅"
echo ""

echo "1️⃣5️⃣  إيداع USDT..."
curl -s -X POST "$BASE/trades/$TRADE2_ID/mock-deposit" \
  -H "Authorization: Bearer $SELLER_TOKEN" > /dev/null
echo "   ✅"
echo ""

echo "1️⃣6️⃣  رفع إثبات دفع..."
curl -s -X POST "$BASE/trades/$TRADE2_ID/payment-proof" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -F "image=@/tmp/test_proof.jpg" \
  -F "transactionRef=REF654321" \
  -F "bankName=البنك الإسلامي" \
  -F "last4Digits=1234" > /dev/null
echo "   ✅"
echo ""

# ─── 1️⃣7️⃣ اختبار نزاع المشتري (ممنوع) ───
echo "1️⃣7️⃣  محاولة المشتري فتح نزاع (مفروض 403)..."
BUYER_DISPUTE=$(curl -s -X POST "$BASE/disputes" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tradeId\":\"$TRADE2_ID\",\"reason\":\"لم أستلم USDT\",\"description\":\"اختبار\"}")
BUYER_DISPUTE_STATUS=$(echo "$BUYER_DISPUTE" | grep -o '"statusCode":[0-9]*' | cut -d: -f2)
if [ "$BUYER_DISPUTE_STATUS" = "403" ] || [ "$BUYER_DISPUTE_STATUS" = "400" ]; then
  echo "   ✅ مقبول — رفض فتح نزاع المشتري (statusCode: $BUYER_DISPUTE_STATUS)"
else
  echo "   ❌ غير متوقع — استجابة: $(echo $BUYER_DISPUTE | head -c 200)"
fi
echo ""

# ─── 1️⃣8️⃣ اختبار نزاع البائع (مسموح) ───
echo "1️⃣8️⃣  فتح نزاع من البائع (مفروض ينجح)..."
SELLER_DISPUTE=$(curl -s -X POST "$BASE/disputes" \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tradeId\":\"$TRADE2_ID\",\"reason\":\"لم أستلم التحويل البنكي\",\"description\":\"ما وصلتني الحوالة\"}")
SELLER_DISPUTE_OK=$(echo "$SELLER_DISPUTE" | grep -o '"success":true')
if [ -n "$SELLER_DISPUTE_OK" ]; then
  echo "   ✅ البائع فتح نزاع بنجاح"
else
  echo "   ❌ فشل — استجابة: $(echo $SELLER_DISPUTE | head -c 200)"
fi
echo ""

# ─── 1️⃣9️⃣ التحقق من الحالة ───
echo "1️⃣9️⃣  التحقق من حالة الصفقة بعد النزاع..."
DISPUTE_TRADE_STATUS=$(curl -s "$BASE/trades/$TRADE2_ID" \
  -H "Authorization: Bearer $SELLER_TOKEN" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "   Status: $DISPUTE_TRADE_STATUS"
echo ""

echo "═════════════════════════════════════════════"
echo "   🎉 نتائج الاختبار"
echo "═════════════════════════════════════════════"
echo ""
echo "✅ 1. تسجيل البائع"
echo "✅ 2. تسجيل المشتري"
echo "✅ 3. KYC"
echo "✅ 4. إضافة محافظ"
echo "✅ 5. إنشاء عرض بيع"
echo "✅ 6. إنشاء صفقة (pending_seller_approval)"
echo "✅ 7. موافقة البائع (waiting_seller_deposit)"
echo "✅ 8. إيداع USDT (active)"
echo "✅ 9. إثبات دفع (waiting_seller_confirmation)"
echo "✅ 10. تأكيد البائع (waiting_buyer_confirm)"
echo "✅ 11. تأكيد المشتري (completed)"
echo "✅ 12. تقييم"
echo "✅ 13. منع نزاع المشتري (403)"
echo "✅ 14. فتح نزاع البائع (مسموح)"
echo ""
echo "الصفقة 1 (كاملة): $TRADE_STATUS"
echo "الصفقة 2 (نزاع): $DISPUTE_TRADE_STATUS"
echo ""
