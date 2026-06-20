'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { disputesApi, tradesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AlertTriangle, Upload, X, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const disputeReasons = [
  { value: 'no_usdt_received', label: 'لم أستلم USDT بعد الدفع' },
  { value: 'no_payment_received', label: 'لم أستلم التحويل البنكي' },
  { value: 'fake_payment_proof', label: 'إثبات دفع مزور (مشتبه به)' },
  { value: 'wrong_amount', label: 'المبلغ المحول غير صحيح' },
  { value: 'delay', label: 'تأخير شديد من الطرف الآخر' },
  { value: 'other', label: 'أخرى' },
];

function NewDisputeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tradeId = searchParams.get('tradeId');
  const { user } = useAuth();
  
  const [trade, setTrade] = useState<any>(null);
  const [isLoadingTrade, setIsLoadingTrade] = useState(true);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tradeId) {
      toast.error('رقم الصفقة مطلوب');
      router.push('/disputes');
      return;
    }
    loadTrade();
  }, [tradeId]);

  const loadTrade = async () => {
    setIsLoadingTrade(true);
    setError(null);
    try {
      const response = await tradesApi.get(tradeId!);
      const tradeData = response.data;
      
      // ✅ التحقق من وجود نزاع سابق وتم حله
      if (tradeData.dispute && tradeData.dispute.status === 'resolved') {
        setError('لا يمكن فتح نزاع جديد، هذا النزاع تم حله سابقاً');
        toast.error('لا يمكن فتح نزاع جديد، هذا النزاع تم حله سابقاً');
        setTimeout(() => {
          router.push(`/trades/${tradeId}`);
        }, 2000);
        return;
      }
      
      // ✅ التحقق من وجود نزاع مفتوح بالفعل
      if (tradeData.dispute && tradeData.dispute.status === 'opened') {
        setError('يوجد نزاع مفتوح بالفعل لهذه الصفقة');
        toast.error('يوجد نزاع مفتوح بالفعل لهذه الصفقة');
        setTimeout(() => {
          router.push(`/disputes/${tradeData.dispute.id}`);
        }, 2000);
        return;
      }
      
      setTrade(tradeData);
    } catch (error) {
      console.error('Failed to load trade:', error);
      setError('فشل في تحميل بيانات الصفقة');
      toast.error('فشل في تحميل بيانات الصفقة');
      setTimeout(() => {
        router.push('/disputes');
      }, 2000);
    } finally {
      setIsLoadingTrade(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      toast.error('بعض الملفات تتجاوز 5 ميجابايت');
    }
    
    setEvidenceFiles([...evidenceFiles, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
    setEvidencePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('يرجى اختيار سبب النزاع');
      return;
    }
    if (!description) {
      toast.error('يرجى كتابة شرح تفصيلي للمشكلة');
      return;
    }
    if (!tradeId) {
      toast.error('رقم الصفقة مطلوب');
      return;
    }

    setIsSubmitting(true);
    try {
      const evidenceUrls = evidencePreviews;
      
      await disputesApi.open({
        tradeId,
        reason,
        description,
        evidenceUrls,
      });
      
      toast.success('تم فتح النزاع بنجاح');
      router.push('/disputes');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في فتح النزاع');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingTrade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{error || 'الصفقة غير موجودة'}</h2>
            <p className="text-blue-200 mb-6">سيتم توجيهك تلقائياً...</p>
            <Link href="/disputes">
              <Button className="mt-4">العودة إلى النزاعات</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/disputes">
          <button className="flex items-center gap-2 text-blue-300 hover:text-white mb-6 transition">
            <ArrowLeft className="w-4 h-4" />
            العودة إلى النزاعات
          </button>
        </Link>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-2">فتح نزاع</h1>
            <p className="text-blue-200 text-sm mb-6">
              الصفقة: {trade.tradeReference} - {trade.amountUsdt} USDT
            </p>

            <div className="space-y-6">
              {/* Warning */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">⚠️ تنبيه مهم</p>
                    <p className="text-sm text-red-300/80 mt-1">
                      فتح نزاع وهمي يؤدي إلى حظر الحساب فوراً
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason - Select Dropdown */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">سبب النزاع *</label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <option value="" className="bg-gray-800 text-gray-400">اختر سبب النزاع</option>
                  {disputeReasons.map((r) => (
                    <option key={r.value} value={r.value} className="bg-gray-800 text-white">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">شرح تفصيلي *</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={5}
                  placeholder="اكتب هنا تفاصيل المشكلة..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">رفع الأدلة (صور، لقطات شاشة)</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-500 transition">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="evidenceFiles"
                  />
                  <label htmlFor="evidenceFiles" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-400">اضغط لرفع الملفات</span>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF - حد أقصى 5MB لكل ملف</p>
                  </label>
                </div>
                {evidencePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {evidencePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt="Evidence" className="w-full h-24 object-cover rounded-lg" />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => router.back()} className="flex-1 border-white/30 text-white hover:bg-white/10">
                  إلغاء
                </Button>
                <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">
                  فتح النزاع
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewDisputePage() {
  return (
    <ProtectedRoute>
      <NewDisputeContent />
    </ProtectedRoute>
  );
}