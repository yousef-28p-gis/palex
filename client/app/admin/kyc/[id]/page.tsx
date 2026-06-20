'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminKycDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKycRequest();
  }, []);

  const loadKycRequest = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getKycRequestById(params.id as string);
      setRequest(response.data);
    } catch (error) {
      console.error('Failed to load KYC request:', error);
      toast.error('فشل في تحميل تفاصيل الطلب');
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '/placeholder-image.jpg';
    // تنظيف المسار من الشرطات المائلة العكسية
    const cleanPath = path.replace(/\\/g, '/');
    return `http://localhost:4000/${cleanPath}?t=${Date.now()}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">الطلب غير موجود</p>
        <Link href="/admin/kyc">
          <Button className="mt-4">العودة إلى الطلبات</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">تفاصيل طلب التوثيق</h1>
            <p className="text-gray-500 text-sm mt-1">مراجعة طلب توثيق الهوية</p>
          </div>
          <Link href="/admin/kyc">
            <Button variant="outline">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة إلى القائمة
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="معلومات مقدم الطلب">
            <div className="space-y-3">
              <div><span className="font-medium">الاسم الكامل:</span> {request.fullName}</div>
              <div><span className="font-medium">رقم الهوية:</span> {request.nationalId}</div>
              <div><span className="font-medium">المحافظة:</span> {request.governorate}</div>
              <div><span className="font-medium">البريد الإلكتروني:</span> {request.user?.email}</div>
              <div><span className="font-medium">تاريخ التقديم:</span> {new Date(request.createdAt).toLocaleDateString('ar')}</div>
            </div>
          </Card>

          <Card title="صورة الهوية">
            {request.idFrontImage ? (
              <img 
                src={getImageUrl(request.idFrontImage)} 
                alt="ID Front" 
                className="w-full max-h-96 object-contain rounded-lg border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=صورة+غير+متاحة';
                }}
              />
            ) : (
              <p className="text-gray-500">لا توجد صورة</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}