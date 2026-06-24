'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Shield, Banknote, Scale, Users, TrendingUp, Clock, CheckCircle, ArrowLeft, Sparkles, Rocket, Wallet, Lock, Zap, Award, Gem, LifeBuoy, Medal, ThumbsUp } from 'lucide-react';

interface PublicStats {
  totalTraders: number;
  totalTradersFormatted: string;
  totalVolume: number;
  totalVolumeFormatted: string;
  avgCompletionTimeMinutes: number;
  avgCompletionTimeFormatted: string;
}

interface TopSeller {
  id: string;
  name: string;
  averageRating: number;
  totalTrades: number;
  successRate: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [isSellersLoading, setIsSellersLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(1);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchStats(), fetchTopSellers()]);
    };
    load();
  }, []);

  useEffect(() => {
    if (!stats && displayCount < 10) {
      const t = setInterval(() => setDisplayCount(v => Math.min(v + 1, 10)), 80);
      return () => clearInterval(t);
    }
  }, [stats, displayCount]);

  const fetchStats = async () => {
    try {
      const r = await fetch('/api/stats/public');
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch (e) { console.error(e); }
  };

  const fetchTopSellers = async () => {
    try {
      const r = await fetch('/api/stats/top-sellers');
      const d = await r.json();
      if (d.success) setTopSellers(d.data);
    } catch (e) { console.error(e); }
    finally { setIsSellersLoading(false); }
  };

  const features = [
    { icon: Shield, title: 'ضمان Escrow', desc: 'أموالك محفوظة بالضمان حتى اكتمال التحويل' },
    { icon: Banknote, title: 'تحويل محلي', desc: 'تحويل بنكي سريع لجميع البنوك الفلسطينية' },
    { icon: Scale, title: 'حماية المتداول', desc: 'فريق متخصص لحل النزاعات خلال 24 ساعة' },
    { icon: Zap, title: 'سرعة التنفيذ', desc: 'صفقات فورية دون تأخير أو انتظار' },
    { icon: Lock, title: 'أمان متكامل', desc: 'نظام تشفير متقدم لحماية أموالك وبياناتك' },
    { icon: LifeBuoy, title: 'دعم فوري', desc: 'فريق دعم جاهز لمساعدتك على مدار الساعة' },
  ];

  const countVal = !stats ? (displayCount >= 10 ? `${displayCount}+` : `${displayCount}`) : '';
  const statsItems = [
    { value: stats ? stats.totalTradersFormatted : countVal, label: 'متداول نشط', icon: Users },
    { value: stats ? stats.totalVolumeFormatted : countVal, label: 'حجم تداول', icon: TrendingUp },
    { value: '0%', label: 'احتيال', icon: Shield },
    { value: 'دقائق', label: 'متوسط التنفيذ', icon: Clock },
  ];

  return (
    <div>

      {/* ────────────── HERO ────────────── */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* خلفية متدرجة مع تأثير */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-900/50 to-transparent" />
        
        {/* العناصر الزخرفية الخلفية */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 md:px-8 lg:px-12 relative z-10">
          <div className="flex flex-col-reverse lg:flex-row lg:items-center gap-6 sm:gap-8 lg:gap-16 xl:gap-20 min-h-[100vh] py-16 sm:py-20 lg:py-0">
            
            {/* ─── الجانب الأيسر: النصوص ─── */}
            <div className="flex-1 text-center lg:text-right">
              
              {/* العنوان الرئيسي */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-4 md:mb-6 leading-tight">
                تداول USDT
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300">
                  بأمان وثقة
                </span>
              </h1>
              
              {/* الوصف */}
              <p className="text-base sm:text-lg md:text-xl text-blue-100/80 mb-6 md:mb-8 leading-relaxed max-w-xl lg:max-w-2xl lg:mx-0 mx-auto">
                منصة التداول الأولى في فلسطين. نظام Escrow يضمن حقوقك في كل صفقة.
              </p>
              
              {/* الأزرار */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center justify-center lg:justify-start">
                <Link href="/register" prefetch={false}>
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/30 font-bold text-base md:text-lg px-8 py-3 justify-center hover:shadow-blue-500/50 transition-all duration-300">
                    ابدأ التداول الآن <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 text-base md:text-lg px-8 py-3 justify-center transition-all duration-300">
                    استكشف المتجر
                  </Button>
                </Link>
              </div>

              {/* Stats تحت الأزرار */}
              <div className="mt-10 md:mt-12">
                <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-[1111px]:gap-1.5">
                  {statsItems.map((s, i) => (
                    <div key={i} className="text-center p-3 md:p-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10 flex-1 max-w-[130px] max-[1111px]:max-w-none max-[1111px]:w-[45%] max-[1111px]:flex-none">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <s.icon className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
                        <span className="text-base md:text-lg font-bold text-white" suppressHydrationWarning>{s.value}</span>
                      </div>
                      <div className="text-[10px] md:text-xs text-blue-300/80">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ─── الجانب الأيمن: الصورة ─── */}
            <div className="w-full max-w-[180px] sm:max-w-[240px] md:max-w-[300px] lg:max-w-[400px] xl:max-w-[500px] 2xl:max-w-[600px] mx-auto lg:mx-0 flex items-center justify-center shrink-0">
              <div className="relative w-full">
                {/* إضاءة خلف الصورة */}
                <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl sm:blur-3xl" />
                {/* الصورة */}
                <img 
                  src="/images/palex-hero.png" 
                  alt="PALEX" 
                  className="relative w-full h-auto object-contain drop-shadow-xl sm:drop-shadow-2xl"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ────────────── FEATURES ────────────── */}
      <section className="py-14 md:py-16 lg:py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-12">
            <Gem className="w-8 h-9 text-blue-600 mx-auto mb-3" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">لماذا <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">PALEX؟</span></h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">منصة تجمع بين الأمان والسرعة والشفافية</p>
          </div>
          <div className="flex flex-col md:flex-row md:flex-wrap justify-center gap-4 md:gap-5 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-4 sm:p-5 w-full md:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.875rem)] border border-blue-100 shadow-sm text-center hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <f.icon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm sm:text-base font-bold text-gray-800">{f.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────── TOP SELLERS ────────────── */}
      <section className="py-14 md:py-16 lg:py-20 bg-blue-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-10 md:mb-12">
            <Award className="w-8 h-9 text-blue-600 mx-auto mb-3" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">أفضل <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">البائعين</span></h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">بائعون موثوقون حصلوا على أعلى التقييمات</p>
          </div>
          <div className="flex flex-col md:flex-row flex-wrap justify-center gap-5 max-w-4xl mx-auto">
            {isSellersLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl p-5 sm:p-6 w-full md:w-[calc(33.333%-1.25rem)] shadow-sm border border-blue-100 text-center">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-200 rounded-full animate-pulse shrink-0" />
                    <div className="flex-1 text-right">
                      <div className="w-20 sm:w-24 h-3 sm:h-4 bg-blue-100 rounded animate-pulse mb-2 mx-auto" />
                      <div className="w-14 sm:w-16 h-2 sm:h-3 bg-blue-50 rounded animate-pulse mx-auto" />
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3 justify-center"><div className="w-16 sm:w-20 h-2 sm:h-3 bg-blue-100 rounded animate-pulse" /></div>
                  <div className="w-full h-2 sm:h-3 bg-blue-100 rounded animate-pulse mb-2" /><div className="w-3/4 h-2 sm:h-3 bg-blue-100 rounded animate-pulse mx-auto" />
                </div>
              ))
            ) : topSellers.length > 0 ? (
              topSellers.map((seller, idx) => (
                <div key={seller.id} className="bg-white rounded-xl p-5 sm:p-6 shadow-sm w-full md:w-[calc(33.333%-1.25rem)] border border-blue-100 text-center hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'} rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0 shadow-sm`}>
                      {idx === 0 ? <Medal className="w-4 h-4 sm:w-5 sm:h-5" /> : seller.name.charAt(0)}
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-gray-800 text-sm sm:text-base">{seller.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-500">{seller.totalTrades} صفقة • {seller.successRate}% نجاح</p>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 mb-3">
                    {seller.averageRating.toFixed(1)} / 5
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{seller.totalTrades} صفقة مكتملة بنسبة نجاح {seller.successRate}%.</p>
                </div>
              ))
            ) : (
              <div className="w-full text-center py-8 sm:py-12 text-gray-400">
                <ThumbsUp className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">لا يوجد بائعون بعد... كن أول من يبدأ التداول!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ────────────── CTA ────────────── */}
      <section className="py-14 md:py-16 lg:py-20 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto gap-5 md:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-2xl flex items-center justify-center">
              <Rocket className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">ابدأ رحلتك الآن</h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-md">
              انضم إلى <span className="font-bold text-white">{stats ? stats.totalTradersFormatted : 'آلاف'}</span> المتداولين الذين يثقون بمنصتنا
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              <div className="flex items-center gap-1.5 text-white/90 text-xs sm:text-sm"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> تداول آمن</div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs sm:text-sm"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> عمولة شفافة</div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs sm:text-sm"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> دعم فوري</div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs sm:text-sm"><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> تحويل محلي</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center">
              <Link href="/register" prefetch={false}>
                <Button size="md" className="bg-white text-blue-700 hover:bg-gray-100 shadow-lg font-bold text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 justify-center">
                  إنشاء حساب مجاني <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="md" className="border-white/30 text-white hover:bg-white/10 text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 justify-center">
                  استكشف العروض
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
