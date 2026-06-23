#!/usr/bin/env python3
"""Debug: تسجيل + محفظة + عرض"""
import requests, json

BASE = "http://localhost:4000/api"

# 1. تسجيل
r = requests.post(f"{BASE}/auth/register", json={
    "email": "test100@test.com", "password": "Test1234!",
    "fullName": "اختبار", "phone": "0591234567"
})
print(f"1. تسجيل: {r.status_code}")
d = r.json()
token = d.get("accessToken", d.get("data", {}).get("accessToken", ""))
print(f"   Token: {token[:30]}..." if token else f"   Error: {d}")
if not token:
    exit(1)

# 2. محفظة
r = requests.post(f"{BASE}/users/wallets",
    headers={"Authorization": f"Bearer {token}"},
    json={"walletType":"trc20","walletAddress":"TVvRxjQRKvKnBDgHqBpqJeaK8Xh47CqFd4"})
print(f"2. محفظة: {r.status_code} {r.json()}")

# 3. عرض
r = requests.post(f"{BASE}/offers",
    headers={"Authorization": f"Bearer {token}"},
    json={"network":"TRC20","fiatCurrency":"ils","pricePerUsdt":3.75,
          "minAmount":10,"maxAmount":500,"paymentInstructions":"تحويل",
          "bankName":"البنك","accountHolderName":"بائع","accountNumber":"1234567890"})
print(f"3. عرض: {r.status_code} {json.dumps(r.json(), ensure_ascii=False)[:200]}")

# 4. جلب المستخدم
r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"})
print(f"4. Me: {r.status_code}")
me = r.json()
print(f"   kyc: {me.get('kycStatus')}")
print(f"   trc20: {me.get('trc20Wallet')}")
