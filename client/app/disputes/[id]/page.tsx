'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { disputesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { 
  AlertTriangle, Clock, CheckCircle, FileText, 
  User, Calendar, Loader2, Send, Image as ImageIcon,
  ArrowLeft, Shield, MessageCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Dispute {
  id: string;
  tradeId: string;
  trade: {
    tradeReference: string;
    amountUsdt: number;
    seller: { fullName: string };
    buyer: { fullName: string };
  };
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: string;
  resolution?: string;
  resolutionNotes?: string;
  openedBy: { fullName: string };
  resolvedBy?: { fullName: string };
  createdAt: string;
  resolvedAt?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  opened: { label: 'مفتوح', color: 'bg-yellow-500/20 text-yellow-300', icon: <AlertTriangle className="w-4 h-4" /> },
  under_review: { label: 'قيد المراجعة', color: 'bg-blue-500/20 text-blue-300', icon: <FileText className="w-4 h-4" /> },
  resolved: { label: 'تم الحل', color: 'bg-green-500/20 text-green-300', icon: <CheckCircle className="w-4 h-4" /> },
};

function DisputeDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const disputeId = params.id as string;
  
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newEvidence, setNewEvidence] = useState<File[]>([]);
  const [newEvidencePreviews, setNewEvidencePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ user: string; message: string; time: string }[]>([]);

  useEffect(() => {
    loadDispute();
  }, [disputeId]);

  const loadDispute = async () => {
    setIsLoading(true);
    try {
      const response = await disputesApi.get(disputeId);
      setDispute(response.data);
    } catch (error) {
      toast.error('فشل في تحميل النزاع');
      router.push('/disputes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    
    setNewEvidence([...newEvidence, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvidencePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setNewEvidence(prev => prev.filter((_, i) => i !== index));
    setNewEvidencePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddEvidence = async () => {
    if (newEvidence.length === 0) {
      toast.error('يرجى اختيار ملفات للإضافة');
      return;
    }

    setIsSubmitting(true);
    try {
      await disputesApi.addEvidence(disputeId, { evidenceUrls: newEvidencePreviews });
      toast.success('تم إضافة الأدلة بنجاح');
      setNewEvidence([]);
      setNewEvidencePreviews([]);
      loadDispute();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في إضافة الأدلة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, { 
        user: 'أنت', 
        message, 
        time: new Date().toLocaleTimeString('ar') 
      }]);
      setMessage('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">النزاع غير موجود</h2>
            <Link href="/disputes">
              <Button className="mt-4">العودة إلى النزاعات</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = statusConfig[dispute.status] || statusConfig.opened;
  const canAddEvidence = dispute.status !== 'resolved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/disputes">
              <button className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">تفاصيل النزاع</h1>
              <p className="text-blue-200 text-sm mt-1">
                الصفقة: {dispute.trade?.tradeReference} - {dispute.trade?.amountUsdt} USDT
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${status.color}`}>
            {status.icon}
            {status.label}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Details */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                تفاصيل النزاع
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-blue-300 text-sm mb-1">سبب النزاع</p>
                  <p className="text-white font-medium">{dispute.reason}</p>
                </div>
                <div>
                  <p className="text-blue-300 text-sm mb-1">الوصف</p>
                  <p className="text-white">{dispute.description}</p>
                </div>
                <div className="flex flex-wrap gap-6 text-sm pt-2 border-t border-white/10">
                  <div>
                    <p className="text-blue-300">فتح بواسطة</p>
                    <p className="text-white font-medium">{dispute.openedBy?.fullName}</p>
                  </div>
                  <div>
                    <p className="text-blue-300">تاريخ الفتح</p>
                    <p className="text-white">{new Date(dispute.createdAt).toLocaleDateString('ar')}</p>
                  </div>
                  {dispute.resolvedAt && (
                    <div>
                      <p className="text-blue-300">تاريخ الحل</p>
                      <p className="text-white">{new Date(dispute.resolvedAt).toLocaleDateString('ar')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resolution */}
            {dispute.status === 'resolved' && dispute.resolution && (
              <div className="bg-green-500/10 backdrop-blur-xl rounded-2xl border border-green-500/30 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  قرار الحل
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-300">القرار:</span>
                    <span className="text-white font-medium">
                      {dispute.resolution === 'release_to_buyer' ? 'تحرير USDT للمشتري' : 
                       dispute.resolution === 'refund_to_seller' ? 'إعادة USDT إلى البائع' : 
                       dispute.resolution}
                    </span>
                  </div>
                  {dispute.resolutionNotes && (
                    <div>
                      <p className="text-blue-300 mb-1">ملاحظات الحل:</p>
                      <p className="text-white">{dispute.resolutionNotes}</p>
                    </div>
                  )}
                  {dispute.resolvedBy && (
                    <p className="text-sm text-blue-400">تم الحل بواسطة: {dispute.resolvedBy.fullName}</p>
                  )}
                </div>
              </div>
            )}

            {/* Evidence */}
            {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  الأدلة المرفوعة
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {dispute.evidenceUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={url} 
                        alt={`Evidence ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-xl border border-white/20 hover:scale-105 transition" 
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Evidence */}
            {canAddEvidence && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
                <h2 className="text-xl font-bold text-white mb-4">إضافة أدلة جديدة</h2>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-500 transition">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="newEvidence"
                    />
                    <label htmlFor="newEvidence" className="cursor-pointer block">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-400">اضغط لرفع أدلة جديدة</span>
                    </label>
                  </div>
                  {newEvidencePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {newEvidencePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img src={preview} className="w-full h-24 object-cover rounded-lg" />
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button onClick={handleAddEvidence} loading={isSubmitting} className="w-full">
                    إضافة الأدلة
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trade Info */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                معلومات الصفقة
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-300">البائع:</span>
                  <span className="text-white">{dispute.trade?.seller?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">المشتري:</span>
                  <span className="text-white">{dispute.trade?.buyer?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">المبلغ:</span>
                  <span className="text-white font-medium">{dispute.trade?.amountUsdt} USDT</span>
                </div>
              </div>
              <Link href={`/trades/${dispute.tradeId}`}>
                <Button variant="outline" className="w-full mt-4 border-white/30 text-white hover:bg-white/10">
                  عرض الصفقة
                </Button>
              </Link>
            </div>

            {/* Chat */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5 h-96 flex flex-col">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                المحادثة
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">لا توجد رسائل بعد</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.user === 'أنت' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 ${msg.user === 'أنت' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                        <div className="text-xs opacity-70">{msg.user}</div>
                        <div className="text-sm">{msg.message}</div>
                        <div className="text-xs opacity-50 mt-1">{msg.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="اكتب رسالتك..."
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DisputeDetailPage() {
  return (
    <ProtectedRoute>
      <DisputeDetailContent />
    </ProtectedRoute>
  );
}