#!/usr/bin/env python3
"""
🧪 اختبار شامل لتدفق Palex مع النزاعات — API صحيح
"""
import requests, json, time, pymysql
from datetime import datetime

BASE = "http://localhost:4000/api"
TS = int(datetime.now().timestamp())

SELLER = {"email": f"sell_{TS}@t.com", "password": "Test1234!", "fullName": "بائع", "phone": "0591111111"}
BUYER = {"email": f"buy_{TS}@t.com", "password": "Test1234!", "fullName": "مشتري", "phone": "0592222222"}

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
    d = res.json()
    return d.get("accessToken", d.get("data", {}).get("accessToken", ""))

def get_trade_id(res):
    d = res.json()
    t = d.get("trade", {})
    return t.get("id", "")

def get_offer_id(res):
    d = res.json()
    o = d.get("offer", {})
    return o.get("id", d.get("id", ""))

def fetch_trade(tid, tok):
    if not tid:
        return {}
    r = requests.get(f"{BASE}/trades/{tid}", headers={"Authorization": f"Bearer {tok}"})
    print(f"  [debug] GET /trades/{tid} → {r.status_code}", flush=True)
    try:
        d = r.json()
        trade = d.get("trade", d.get("data", d))
        result = trade if isinstance(trade, dict) else d
        print(f"  [debug] status={result.get('status','?')}", flush=True)
        return result
    except Exception as e:
        print(f"  [debug] parse error: {e}", flush=True)
        return {}

log("═════════════════════════════════════════════")
log("   🧪 اختبار شامل لتدفق Palex")
log("═════════════════════════════════════════════")

# ─── 1️⃣ تسجيل ───
log("1️⃣  تسجيل بائع...")
r = requests.post(f"{BASE}/auth/register", json=SELLER)
STK = get_token(r)
test("بائع", r.status_code == 201 and bool(STK))

log("2️⃣  تسجيل مشتري...")
r = requests.post(f"{BASE}/auth/register", json=BUYER)
BTK = get_token(r)
test("مشتري", r.status_code == 201 and bool(BTK))

if not STK or not BTK:
    log("⚠️ فشل التسجيل"); exit(1)

# ─── IDs ───
SID = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {STK}"}).json().get("id","")
BID = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {BTK}"}).json().get("id","")
test("ID بائع", bool(SID))
test("ID مشتري", bool(BID))

# ─── 3️⃣ KYC ───
log("3️⃣  KYC...")
try:
    conn = pymysql.connect(host="127.0.0.1", port=3306, user="palex",
        password="PalexStrongPass123!", database="p2pescrow", charset="utf8mb4")
    with conn.cursor() as cur:
        cur.execute(f"UPDATE users SET kyc_status='approved' WHERE id='{SID}' OR id='{BID}';")
    conn.commit(); conn.close()
    test("KYC", True)
except Exception as e:
    test("KYC", False, str(e))

# ─── 4️⃣ محافظ ───
log("4️⃣  محافظ TRC20...")
r = requests.post(f"{BASE}/users/wallets", headers={"Authorization": f"Bearer {STK}"},
    json={"trc20Wallet": "TVvRxjQRKvKnBDgHqBpqJeaK8Xh47CqFd4"})
test("محفظة بائع", r.status_code in [200, 201])
r = requests.post(f"{BASE}/users/wallets", headers={"Authorization": f"Bearer {BTK}"},
    json={"trc20Wallet": "TMgG519etBJkAnCM5NcEjADNRErFJsXGMF"})
test("محفظة مشتري", r.status_code in [200, 201], f"{r.status_code} {r.json()}")

# ─── 5️⃣ عرض ───
log("5️⃣  عرض بيع...")
r = requests.post(f"{BASE}/offers", headers={"Authorization": f"Bearer {STK}"},
    json={"network":"trc20","fiatCurrency":"ils","premiumPercent":0,
          "minAmount":10,"maxAmount":500,"paymentInstructions":"تحويل بنكي فوري","bankName":"البنك الإسلامي"})
OID = get_offer_id(r)
test("عرض", r.status_code == 201 and bool(OID), f"status={r.status_code}")
if not OID:
    log(f"⚠️ {r.text[:200]}"); exit(1)

# ─── 6️⃣ صفقة ───
log("6️⃣  إنشاء صفقة (50 USDT)...")
r = requests.post(f"{BASE}/trades", headers={"Authorization": f"Bearer {BTK}"},
    json={"offerId": OID, "amountUsdt": 50})
T1 = get_trade_id(r)
test("صفقة", r.status_code == 201 and bool(T1))
t = fetch_trade(T1, BTK)
test("pending_seller_approval", t.get("status") == "pending_seller_approval", f"status={t.get('status','?')}")

# ─── 7️⃣ موافقة بائع ───
log("7️⃣  موافقة البائع...")
r = requests.post(f"{BASE}/trades/{T1}/approve", headers={"Authorization": f"Bearer {STK}"})
test("موافقة", r.status_code in [200, 201])
time.sleep(0.5)
t = fetch_trade(T1, BTK)
test("waiting_seller_deposit", t.get("status") == "waiting_seller_deposit", f"status={t.get('status','?')}")

# ─── 8️⃣ إيداع ───
log("8️⃣  إيداع USDT (mock)...")
r = requests.post(f"{BASE}/trades/{T1}/mock-deposit", headers={"Authorization": f"Bearer {STK}"})
test("إيداع", r.status_code in [200, 201])
time.sleep(0.5)
t = fetch_trade(T1, BTK)
test("active", t.get("status") == "active", f"status={t.get('status','?')}")

# ─── 9️⃣ إثبات دفع ───
log("9️⃣  إثبات دفع...")
open("/tmp/p.jpg","wb").write(b"\xff\xd8\xff\xe0")
with open("/tmp/p.jpg","rb") as f:
    r = requests.post(f"{BASE}/trades/{T1}/payment-proof",
        headers={"Authorization": f"Bearer {BTK}"},
        files={"image":("p.jpg",f,"image/jpeg"),
               "transactionRef":(None,"REF123"),
               "bankName":(None,"الإسلامي"),
               "last4Digits":(None,"5678")})
test("إثبات", r.status_code in [200,201], f"{r.status_code} {r.text[:100]}")
time.sleep(0.5)
t = fetch_trade(T1, BTK)
test("waiting_seller_confirmation", t.get("status") == "waiting_seller_confirmation", f"status={t.get('status','?')}")

# ─── 🔟 تأكيد البائع → waiting_buyer_confirm ───
log("🔟  تأكيد البائع...")
r = requests.post(f"{BASE}/trades/{T1}/confirm-payment", headers={"Authorization": f"Bearer {STK}"})
test("confirmPayment", r.status_code in [200,201], f"{r.status_code} {r.text[:150]}")
time.sleep(1)
t = fetch_trade(T1, BTK)
test("waiting_buyer_confirm ⏳", t.get("status") == "waiting_buyer_confirm", f"status={t.get('status','?')}")

# ─── 1️⃣1️⃣ تأكيد المشتري ───
log("1️⃣1️⃣  تأكيد المشتري...")
r = requests.post(f"{BASE}/trades/{T1}/confirm-receipt", headers={"Authorization": f"Bearer {BTK}"})
test("confirmReceipt", r.status_code in [200,201], f"{r.status_code} {r.text[:150]}")
time.sleep(0.5)
t = fetch_trade(T1, BTK)
test("completed 🎉", t.get("status") == "completed", f"status={t.get('status','?')}")

# ─── 1️⃣2️⃣ تقييم ───
log("1️⃣2️⃣  تقييم...")
r = requests.post(f"{BASE}/reviews", headers={"Authorization": f"Bearer {BTK}","Content-Type":"application/json"},
    json={"tradeId": T1, "rating": 5, "comment": "ممتاز"})
test("تقييم", r.status_code in [200,201])

# ════════════════════════════════════════
log("\n═══ ⚖️  اختبار النزاعات ═══")

# ─── صفقة ثانية ───
log("13️⃣  صفقة جديدة للنزاع...")
r = requests.post(f"{BASE}/trades", headers={"Authorization": f"Bearer {BTK}"},
    json={"offerId": OID, "amountUsdt": 30})
T2 = get_trade_id(r)
test("صفقة ثانية", bool(T2))
requests.post(f"{BASE}/trades/{T2}/approve", headers={"Authorization": f"Bearer {STK}"})
time.sleep(0.3)
requests.post(f"{BASE}/trades/{T2}/mock-deposit", headers={"Authorization": f"Bearer {STK}"})
time.sleep(0.3)
with open("/tmp/p.jpg","rb") as f:
    requests.post(f"{BASE}/trades/{T2}/payment-proof",
        headers={"Authorization": f"Bearer {BTK}"},
        files={"image":("p.jpg",f,"image/jpeg"),
               "transactionRef":(None,"REF456"),
               "bankName":(None,"الإسلامي"),
               "last4Digits":(None,"1234")})
time.sleep(0.3)
t2 = fetch_trade(T2, BTK)
test("وصول لـ waiting_seller_confirmation", t2.get("status") == "waiting_seller_confirmation", t2.get("status",""))

# ─── 1️⃣4️⃣ المشتري يفتح نزاع (ممنوع) ───
log("14️⃣  المشتري يفتح نزاع...")
r = requests.post(f"{BASE}/disputes", headers={"Authorization": f"Bearer {BTK}","Content-Type":"application/json"},
    json={"tradeId": T2, "reason": "لم أستلم USDT", "description": "ما وصلني"})
test("نزاع المشتري ممنوع ❌", r.status_code in [400,403], f"{r.status_code} {r.json().get('message','')[:80]}")

# ─── 1️⃣5️⃣ البائع يفتح نزاع (مسموح) ───
log("15️⃣  البائع يفتح نزاع...")
r = requests.post(f"{BASE}/disputes", headers={"Authorization": f"Bearer {STK}","Content-Type":"application/json"},
    json={"tradeId": T2, "reason": "لم أستلم التحويل البنكي", "description": "ما وصلتني الحوالة"})
test("نزاع البائع مسموح ✅", r.status_code in [200,201], f"{r.status_code} {r.text[:80]}")
time.sleep(0.5)
t2 = fetch_trade(T2, BTK)
test("dispute_opened", t2.get("status") == "dispute_opened", t2.get("status",""))

# ════════════════════════════════════════
total = PASS + FAIL
log("\n═════════════════════════════════════════════")
log("   📊  النتائج النهائية")
log("═════════════════════════════════════════════")
print(f"\n✅ نجاح: {PASS}/{total}")
print(f"❌ فشل:  {FAIL}/{total}")
print(f"الصفقة 1: {t.get('status','?')}")
print(f"الصفقة 2: {t2.get('status','?')}")
print()
if FAIL == 0:
    print("🎉 كل شيء تمام!")
else:
    print(f"⚠️  {FAIL} فشل — راجع أعلاه")
    exit(1)
