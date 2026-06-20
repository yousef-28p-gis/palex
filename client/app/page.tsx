'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  Shield, Banknote, Scale, Users, TrendingUp, Clock, CheckCircle, 
  ArrowLeft, Sparkles, Rocket, Star, Wallet, Lock, Zap, Award, 
  Globe, Headphones, Gem, LifeBuoy 
} from 'lucide-react';
import { ratesApi } from '@/lib/api';

export default function HomePage() {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    try {
      const response = await ratesApi.getAllRates();
      if (response.data?.data?.exchange) {
        setExchangeRate(response.data.data.exchange.usdToIls);
        setLastUpdated(new Date(response.data.data.exchange.lastUpdated).toLocaleDateString('ar'));
      }
    } catch (error) {
      console.error('Exchange rate load failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { value: '500+', label: 'تاجر موثوق', icon: Users },
    { value: '2M+', label: 'حجم تداول', icon: TrendingUp },
    { value: '0%', label: 'احتيال', icon: Shield },
    { value: '< دقيقة', label: 'متوسط الوقت', icon: Clock },
  ];

  const features = [
    { icon: Shield, title: 'ضمان Escrow', description: 'USDT يتم حجزها في الضمان حتى تأكيد التحويل البنكي', color: '#2563eb' },
    { icon: Banknote, title: 'تحويل بنكي محلي', description: 'ندعم جميع البنوك الفلسطينية', color: '#10b981' },
    { icon: Scale, title: 'نظام نزاعات متكامل', description: 'فريق دعم لحل أي مشكلة خلال 24 ساعة', color: '#f59e0b' },
    { icon: Zap, title: 'تداول فوري', description: 'صفقات سريعة دون انتظار', color: '#8b5cf6' },
    { icon: Lock, title: 'أمان عالي', description: 'تشفير متقدم وحماية للأموال', color: '#ef4444' },
    { icon: LifeBuoy, title: 'دعم 24/7', description: 'فريق دعم جاهز لمساعدتك', color: '#06b6d4' },
  ];

  const testimonials = [
    { name: 'محمد أبو علي', role: 'متداول محترف', rating: 5, text: 'أفضل منصة لتداول USDT في فلسطين. نظام الضمان يريح البال.', avatar: 'م' },
    { name: 'سارة أحمد', role: 'مستثمرة', rating: 5, text: 'تجربة رائعة. التحويلات البنكية سريعة والدعم متجاوب جداً.', avatar: 'س' },
    { name: 'خالد محمود', role: 'تاجر معتمد', rating: 5, text: 'منصة موثوقة وآمنة. أنصح بها الجميع.', avatar: 'خ' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2232&auto=format')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500 rounded-full blur-3xl opacity-10 animate-pulse delay-500" />
        </div>

        <div className="container mx-auto px-4 relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-right">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white/90">منصة PALEX - التداول الآمن في فلسطين</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight">
                تداول USDT
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  بأمان وثقة
                </span>
              </h1>
              
              <p className="text-base md:text-lg text-blue-100 mb-8 max-w-lg lg:max-w-none leading-relaxed">
                منصة الضمان الأولى في فلسطين. اشترِ وبِع USDT عبر التحويل البنكي المحلي.
                نظام Escrow يحمي أموالك ويضمن سلامة صفقاتك.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/register">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Rocket className="w-5 h-5" />
                    ابدأ التداول الآن
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:border-white/50">
                    استكشف المتجر
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <Wallet className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <h3 className="text-white text-xl font-bold mb-1">أرقام تثق بنا</h3>
                  <p className="text-blue-200 text-sm">انضم إلى آلاف المتداولين</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="text-center p-3 rounded-xl bg-white/5">
                      <div className="flex items-center justify-center gap-1">
                        <stat.icon className="w-5 h-5 text-blue-400" />
                        <span className="text-2xl font-bold text-white">{stat.value}</span>
                      </div>
                      <div className="text-xs text-blue-200 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-white/70 text-xs mt-2">تقييم المستخدمين</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-16">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff" opacity="0.1"></path>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Gem className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              لماذا تختار <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">PALEX؟</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              نقدم لك تجربة تداول فريدة تجمع بين الأمان والسرعة والشفافية
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, idx) => (
              <div key={idx} className="group relative bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-bl-2xl rounded-tr-xl opacity-0 group-hover:opacity-100 transition" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: `${feature.color}15` }}>
                    <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-md font-bold text-gray-800 mb-1.5">{feature.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Award className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ماذا يقول <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">المتداولون؟</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              ثقة آلاف المتداولين تجعلنا الأفضل في فلسطين
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-md">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">{t.name}</h4>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-2">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900" />
        <div className="absolute inset-0 opacity-10">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-xl mb-5 shadow-lg">
              <Rocket className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              جاهز لبدء التداول؟
            </h2>
            
            <p className="text-md text-blue-100 mb-4">
              انضم إلى أكثر من <span className="font-bold text-white">2,000 متداول</span> يثقون بمنصتنا
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <div className="flex items-center gap-1.5 text-white/90 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span>تداول آمن</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span>عمولة شفافة</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span>دعم فوري</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span>تحويلات محلية</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <Button size="md" className="bg-white text-blue-700 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 font-bold px-6">
                  إنشاء حساب مجاني
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="md" className="border-white/30 text-white hover:bg-white/10 hover:border-white/50">
                  <Globe className="w-4 h-4" />
                  استكشف العروض
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-6">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="#ffffff" opacity="0.9"></path>
          </svg>
        </div>
      </div>
    </div>
  );
}