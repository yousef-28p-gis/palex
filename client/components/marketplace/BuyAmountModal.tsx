'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface BuyAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    id: string;
    minAmount: number;
    maxAmount: number;
    price: number;
    fiatCurrency: string;
    network: string;
    premiumPercent?: number;
    seller?: {
      fullName?: string;
      totalTrades?: number;
      averageRating?: number;
    };
  };
  networkFee?: number;
  usdToIls?: number;
  onConfirm: (amount: number) => void;
  isLoading: boolean;
}

export function BuyAmountModal({ isOpen, onClose, offer, networkFee = 0, usdToIls = 3, onConfirm, isLoading }: BuyAmountModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount(offer.minAmount.toString());
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, offer.minAmount]);

  if (!isOpen) return null;

  const currencySymbol = offer.fiatCurrency === 'ils' ? '₪' : '$';
  const amountNum = parseFloat(amount) || 0;
  const totalFiat = amountNum * offer.price;
  const platformFee = amountNum * 0.01;
  const totalDeductions = platformFee + networkFee;
  const netUsdt = Math.max(0, amountNum - totalDeductions);
  const premiumPct = offer.premiumPercent || 0;
  const baseRate = premiumPct !== 0 ? offer.price / (1 + premiumPct / 100) : offer.price;
  const totalInUsd = offer.fiatCurrency === 'ils' ? totalFiat / usdToIls : totalFiat;
  const totalInIls = offer.fiatCurrency === 'usd' ? totalFiat * usdToIls : totalFiat;

  const handleConfirm = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      setError('يرجى إدخال رقم صحيح');
      return;
    }
    if (amountNum < offer.minAmount) {
      setError(`الحد الأدنى للشراء هو ${offer.minAmount} USDT`);
      return;
    }
    if (amountNum > offer.maxAmount) {
      setError(`الحد الأقصى للشراء هو ${offer.maxAmount} USDT`);
      return;
    }
    setError('');
    onConfirm(amountNum);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
      {/* خلفية */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />

      {/* المحتوى */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* الهيدر */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">شراء USDT</h2>
            <p className="text-[10px] sm:text-xs text-blue-300 mt-0.5 truncate max-w-[180px] sm:max-w-[250px]">
              من {offer.seller?.fullName || 'البائع'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </button>
        </div>

        {/* المحتوى */}
        <div className="p-3 sm:p-5 space-y-2.5 sm:space-y-4">
          {/* حقل إدخال المبلغ */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-blue-200 mb-2">
              المبلغ المطلوب (USDT)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                step="any"
                min={offer.minAmount}
                max={offer.maxAmount}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                className="w-full px-3 sm:px-4 py-3 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white text-base sm:text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="أدخل المبلغ"
                disabled={isLoading}
                dir="ltr"
              />
              <span className="absolute inset-y-0 right-3 sm:right-4 flex items-center text-blue-300 text-xs sm:text-sm font-medium pointer-events-none">
                USDT
              </span>
            </div>

            {/* حدود المبلغ */}
            <div className="flex flex-col sm:flex-row sm:justify-between mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-blue-300 gap-0.5 sm:gap-0">
              <span>الحد الأدنى: <span className="text-white">{offer.minAmount} USDT</span></span>
              <span>الحد الأقصى: <span className="text-white">{offer.maxAmount} USDT</span></span>
            </div>
          </div>

          {/* تفاصيل الدفع - تظهر فقط إذا في مبلغ صحيح */}
          {amountNum > 0 && (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              {/* تفاصيل الدفع */}
              <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-500/10">
                <p className="text-blue-300 text-xs sm:text-sm font-semibold">💰 تفاصيل الدفع</p>
              </div>
              <div className="p-3 sm:p-4 space-y-2 border-b border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-[10px] sm:text-xs">💰 المبلغ الإجمالي</span>
                  <span className="text-white text-xs sm:text-sm font-medium">{amountNum} USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-[10px] sm:text-xs">📊 سعر الصرف الأساسي</span>
                  <span className="text-white text-xs sm:text-sm">{baseRate.toFixed(4)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-[10px] sm:text-xs">📈 نسبة البائع</span>
                  <span className={premiumPct > 0 ? 'text-red-400 text-xs sm:text-sm' : 'text-green-400 text-xs sm:text-sm'}>{premiumPct > 0 ? `+${premiumPct}%` : `${premiumPct}%`}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-[10px] sm:text-xs">💵 السعر النهائي</span>
                  <span className="text-white text-xs sm:text-sm font-bold">{offer.price} {currencySymbol}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-500/10 rounded-lg -mx-1 sm:-mx-2 px-2 sm:px-3 py-2 border border-blue-500/20">
                  <span className="text-blue-200 text-xs sm:text-sm font-bold">🏦 إجمالي المبلغ المطلوب تحويله</span>
                  <span className="text-white font-bold text-sm sm:text-base">{totalFiat.toFixed(2)} {currencySymbol}</span>
                </div>
              </div>

              {/* الرسوم والصافي */}
              <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-yellow-500/10">
                <p className="text-yellow-300 text-xs sm:text-sm font-semibold">📉 الرسوم والصافي</p>
              </div>
              <div className="p-3 sm:p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-[10px] sm:text-xs">🌐 رسوم الشبكة ({offer.network?.toUpperCase()})</span>
                  <span className="text-yellow-300 text-xs sm:text-sm">{networkFee.toFixed(6)} USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-[10px] sm:text-xs">🏢 عمولة المنصة (1%)</span>
                  <span className="text-yellow-300 text-xs sm:text-sm">{platformFee.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-[10px] sm:text-xs">📉 إجمالي الخصومات</span>
                  <span className="text-orange-300 text-xs sm:text-sm">{totalDeductions.toFixed(6)} USDT</span>
                </div>
                <div className="flex justify-between items-center bg-green-500/10 rounded-lg -mx-1 sm:-mx-2 px-2 sm:px-3 py-2 border border-green-500/20">
                  <span className="text-green-300 text-xs sm:text-sm font-bold">✅ صافي ما تستلمه</span>
                  <span className="text-green-400 font-bold text-sm sm:text-base">{netUsdt.toFixed(6)} USDT</span>
                </div>
              </div>
            </div>
          )}

          {/* خطأ */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 sm:p-3">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
              <p className="text-xs sm:text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* الأزرار */}
        <div className="flex gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition text-sm disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري...</>
            ) : (
              'تأكيد الشراء'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
