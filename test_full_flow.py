#!/usr/bin/env python3
"""
🧪 اختبار شامل لتدفق Palex مع النزاعات
"""
import requests
import json
import time
import pymysql
from datetime import datetime

BASE = "http://localhost:4000/api"
TS = int(datetime.now().timestamp())

SELLER = {"email": f"seller_{TS}@test.com", "password": "Test1234!", "fullName": "بائع تجريبي", "phone": "0599999999"}
BUYER = {"email": f"buyer_{TS}@test.com", "password": "Test1234!", "fullName": "مشتري تجريبي", "phone": "0598888888"}

PASS, FAIL = 0, 0

def test(name, ok, detail=""):
    global PASS, FAIL
    if ok:
        print(f"  ✅ {name}")
        PASS += 1
    else:
        print(f"  ❌ {name} — {detail}")
        FAIL += 1

def log(msg):
    print(f"\n{msg}")

def get_token(res):
    """استخراج accessToken من استجابة NestJS"""
    d = res.json()
    return d.get("accessToken", d.get("data", {}).get("accessToken", ""))

def get_trade_id(res):
    d = res.json()
    t = d.get("trade", {})
    return t.get("id", d.get("tradeId", ""))

def get_status(trade_data):
    if isinstance(trade_data, dict):
        return trade_data.get("status", "")
    return ""

def fetch_trade(trade_id, token):
    r = requests.get(f"{BASE}/trades/{trade_id}", headers={"Authorization": f"Bearer {token}"})
    d = r.json()
    return d.get("trade", d.get("data", {}))

log("═════════════════════════════════════════════")
log("   🧪 اختبار شامل لتدفق Palex")
log("═════════════════════════════════════════════")

# ─── 1️⃣ تسجيل بائع ───
log("1️⃣  تسجيل بائع...")
r = requests.post(f"{BASE}/auth/register", json=SELLER)
SELLER_TOKEN = get_token(r)
test("تسجيل بائع", r.status_code == 201 and bool(SELLER_TOKEN), f"status={r.status_code}")

# ─── 2️⃣ تسجيل مشتري ───
log("2️⃣  تسجيل مشتري...")
r = requests.post(f"{BASE}/auth/register", json=BUYER)
BUYER_TOKEN = get_token(r)
test("تسجيل مشتري", r.status_code == 201 and bool(BUYER_TOKEN), f"status={r.status_code}")

if not SELLER_TOKEN or not BUYER_TOKEN:
    log("\n⚠️ فشل التسجيل")
    exit(1)

# ─── جلب IDs ───
r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {SELLER_TOKEN}"})
SELLER_ID = r.json().get("id", "")
r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {BUYER_TOKEN}"})
BUYER_ID = r.json().get("id", "")
test("ID البائع", bool(SELLER_ID))
test("ID المشتري", bool(BUYER_ID))

# ─── 3️⃣ KYC ───
log("3️⃣  تفعيل KYC...")
try:
    conn = pymysql.connect(
        host="127.0.0.1", port=3306,
        user="palex", password="PalexStrongPass123!", database="p2pescrow",
        charset="utf8mb4"
    )
    with conn.cursor() as cur:
        cur.execute(f"UPDATE users SET kyc_status='approved' WHERE id='{SELLER_ID}' OR id='{BUYER_ID}';")
    conn.commit()
    conn.close()
    test("KYC", True)
except Exception as e:
    test("KYC", False, str(e))

# ─── 4️⃣ إضافة محافظ ───
log("4️⃣  إضافة محافظ TRC20...")
for name, tok, addr in [("بائع", SELLER_TOKEN, "TVvRxjQRKvKnBDgHqBpqJeaK8Xh47CqFd4"),
                          ("مشتري", BUYER_TOKEN, "TXYZ1234567890abcdef1234567890abcdef12")]:
    r = requests.post(f"{BASE}/users/wallets",
        headers={"Authorization": f"Bearer {tok}"},
        json={"walletType":"trc20","walletAddress": addr})
    test(f"محفظة {name}", r.status_code in [200, 201, 409])

# ─── 5️⃣ إنشاء عرض ───
log("5️⃣  إنشاء عرض بيع...")
r = requests.post(f"{BASE}/offers",
    headers={"Authorization": f"Bearer {SELLER_TOKEN}"},
    json={"network":"TRC20","fiatCurrency":"ils","pricePerUsdt":3.75,
          "minAmount":10,"maxAmount":500,"paymentInstructions":"تحويل للبنك الإسلامي",
          "bankName":"البنك الإسلامي","accountHolderName":"بائع تجريبي","accountNumber":"1234567890"})
OFFER_ID = r.json().get("id", "") or r.json().get("offer", {}).get("id", "")
test("عرض بيع", r.status_code == 201 and bool(OFFER_ID), f"status={r.status_code}")

# ─── 6️⃣ إنشاء صفقة ───
log("6️⃣  إنشاء صفقة...")
r = requests.post(f"{BASE}/trades",
    headers={"Authorization": f"Bearer {BUYER_TOKEN}"},
    json={"offerId": OFFER_ID, "amountUsdt": 50})
TRADE_ID = get_trade_id(r)
test("إنشاء صفقة", r.status_code == 201 and bool(TRADE_ID))

trade1 = fetch_trade(TRADE_ID, BUYER_TOKEN)
test("pending_seller_approval", get_status(trade1) == "pending_seller_approval", get_status(trade1))

# ─── 7️⃣ موافقة البائع ───
log("7️⃣  موافقة البائع...")
r = requests.post(f"{BASE}/trades/{TRADE_ID}/approve", headers={"Authorization": f"Bearer {SELLER_TOKEN}"})
test("موافقة", r.status_code in [200, 201])
time.sleep(1)
trade1 = fetch_trade(TRADE_ID, BUYER_TOKEN)
test("waiting_seller_deposit", get_status(trade1) == "waiting_seller_deposit", get_status(trade1))

# ─── 8️⃣ إيداع USDT ───
log("8️⃣  إيداع USDT (mock)...")
r = requests.post(f"{BASE}/trades/{TRADE_ID}/mock-deposit", headers={"Authorization": f"Bearer {SELLER_TOKEN}"})
test("إيداع", r.status_code in [200, 201])
time.sleep(1)
trade1 = fetch_trade(TRADE_ID, BUYER_TOKEN)
test("active", get_status(trade1) == "active", get_status(trade1))

# ─── 9️⃣ إثبات دفع ───
log("9️⃣  رفع إثبات دفع...")
open("/tmp/test_proof.jpg", "wb").write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00")
with open("/tmp/test_proof.jpg", "rb") as img:
    r = requests.post(f"{BASE}/trades/{TRADE_ID}/payment-proof",
        headers={"Authorization": f"Bearer {BUYER_TOKEN}"},
        files={"image": ("proof.jpg", img, "image/jpeg"),
               "transactionRef": (None, "REF123456"),
               "bankName": (None, "البنك الإسلامي"),
               "last4Digits": (None, "5678")})
test("إثبات دفع", r.status_code in [200, 201], f"status={r.status_code} {r.text[:200]}")
time.sleep(1)
trade1 = fetch_trade(TRADE_ID, BUYER_TOKEN)
test("waiting_seller_confirmation", get_status(trade1) == "waiting_seller_confirmation", get_status(trade1))

# ─── 🔟 تأكيد البائع ───
log("🔟  تأكيد البائع (confirmPayment)...")
r = requests.post(f"{BASE}/trades/{TRADE_ID}/confirm-payment",
    headers={"Authorization": f"Bearer {SELLER_TOKEN}"})
test("تأكيد البائع", r.status_code in [200, 201], r.text[:200])
time.sleep(1)
trade1 = fetch_trade(TRADE_ID, BUYER_TOKEN)
test("waiting_buyer_confirm", get_status(trade1) == "waiting_buyer_confirm", get_status(trade1))

# ─── 1️⃣1️⃣ تأكيد المشتري ───
log("1️⃣1️⃣  تأكيد المشتري (confirmReceipt)...")
r = requests.post(f"{BASE}/trades/{TRADE_ID}/confirm-receipt",
    headers={"Authorization": f"Bearer {BUYER_TOKEN}"})
test("تأكيد المشتري", r.status_code in [200, 201], r.text[:200])
time.sleep(1)
trade1 = fetch_trade(TRADE_ID, BUYER_TOKEN)
test("completed 🎉", get_status(trade1) == "completed", get_status(trade1))

# ─── 1️⃣2️⃣ تقييم ───
log("1️⃣2️⃣  تقييم...")
r = requests.post(f"{BASE}/reviews",
    headers={"Authorization": f"Bearer {BUYER_TOKEN}", "Content-Type": "application/json"},
    json={"tradeId": TRADE_ID, "rating": 5, "comment": "ممتاز 👌"})
test("تقييم", r.status_code in [200, 201])

# ════════════════════════════════════════
log("\n═════════════════════════════════════════════")
log("   ⚖️  اختبار النزاعات")
log("═════════════════════════════════════════════")

# ─── صفقة جديدة للنزاع ───
log("13️⃣  صفقة جديدة لاختبار النزاع...")
r = requests.post(f"{BASE}/trades",
    headers={"Authorization": f"Bearer {BUYER_TOKEN}"},
    json={"offerId": OFFER_ID, "amountUsdt": 30})
TRADE2_ID = get_trade_id(r)
test("إنشاء صفقة", bool(TRADE2_ID))

# موافقة + إيداع + إثبات
requests.post(f"{BASE}/trades/{TRADE2_ID}/approve", headers={"Authorization": f"Bearer {SELLER_TOKEN}"})
time.sleep(0.5)
requests.post(f"{BASE}/trades/{TRADE2_ID}/mock-deposit", headers={"Authorization": f"Bearer {SELLER_TOKEN}"})
time.sleep(0.5)
with open("/tmp/test_proof.jpg", "rb") as img:
    requests.post(f"{BASE}/trades/{TRADE2_ID}/payment-proof",
        headers={"Authorization": f"Bearer {BUYER_TOKEN}"},
        files={"image": ("proof.jpg", img, "image/jpeg"),
               "transactionRef": (None, "REF654321"),
               "bankName": (None, "البنك الإسلامي"),
               "last4Digits": (None, "1234")})
time.sleep(0.5)
trade2 = fetch_trade(TRADE2_ID, BUYER_TOKEN)
test("وصول لـ waiting_seller_confirmation", get_status(trade2) == "waiting_seller_confirmation", get_status(trade2))

# ─── 1️⃣4️⃣ المشتري يفتح نزاع (ممنوع) ───
log("14️⃣  المشتري يحاول فتح نزاع...")
r = requests.post(f"{BASE}/disputes",
    headers={"Authorization": f"Bearer {BUYER_TOKEN}", "Content-Type": "application/json"},
    json={"tradeId": TRADE2_ID, "reason": "لم أستلم USDT", "description": "ما وصلني"})
denied = r.status_code in [400, 403]
test("نزاع المشتري ممنوع ❌", denied, f"status={r.status_code} {r.json().get('message','')[:100]}")

# ─── 1️⃣5️⃣ البائع يفتح نزاع (مسموح) ───
log("15️⃣  البائع يفتح نزاع...")
r = requests.post(f"{BASE}/disputes",
    headers={"Authorization": f"Bearer {SELLER_TOKEN}", "Content-Type": "application/json"},
    json={"tradeId": TRADE2_ID, "reason": "لم أستلم التحويل البنكي", "description": "ما وصلتني الحوالة"})
test("نزاع البائع مسموح ✅", r.status_code in [200, 201], f"status={r.status_code}")
time.sleep(1)
trade2 = fetch_trade(TRADE2_ID, BUYER_TOKEN)
test("dispute_opened", get_status(trade2) == "dispute_opened", get_status(trade2))

# ════════════════════════════════════════
total = PASS + FAIL
log("\n═════════════════════════════════════════════")
log("   📊  النتائج النهائية")
log("═════════════════════════════════════════════")
print(f"\n✅ نجاح: {PASS}/{total}")
print(f"❌ فشل:  {FAIL}/{total}")
print(f"\nالصفقة 1 (كاملة): {get_status(trade1)}")
print(f"الصفقة 2 (نزاع):  {get_status(trade2)}")
print()
if FAIL == 0:
    print("🎉 كل الاختبارات نجحت!")
else:
    print(f"⚠️  {FAIL} اختبار فشل")
    exit(1)
