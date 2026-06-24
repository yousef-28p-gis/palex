import Link from 'next/link';
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, Shield, Clock, Headphones } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/palex-icon-32.png" alt="PALEX" className="w-8 h-8 object-contain rounded-lg" />
              <span className="text-xl font-bold">PALEX</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              منصة الضمان الأولى في فلسطين لتداول USDT P2P. نضمن لك تداولاً آمناً عبر التحويل البنكي المحلي.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              <li><Link href="/marketplace" className="text-gray-400 hover:text-white transition">المتجر</Link></li>
              <li><Link href="/dashboard" className="text-gray-400 hover:text-white transition">لوحة التحكم</Link></li>
              <li><Link href="/trades" className="text-gray-400 hover:text-white transition">صفقاتي</Link></li>
              <li><Link href="/kyc" className="text-gray-400 hover:text-white transition">توثيق الهوية</Link></li>
            </ul>
          </div>

          {/* Support */}
          {/* Support */}
<div>
  <h3 className="font-semibold text-lg mb-4">الدعم الفني</h3>
  <ul className="space-y-2">
    <li className="flex items-center gap-2 text-gray-400">
      <Headphones className="w-4 h-4" />
      <span>دعم 24/7 عبر واتساب</span>
    </li>
    <li className="flex items-center gap-2 text-gray-400">
      <a 
        href="https://wa.me/9705991234567" 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:text-green-400 transition flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.01-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        </svg>
        <span>واتساب: +970 59 123 4567</span>
      </a>
    </li>
  </ul>
</div>

          {/* Security */}
          <div>
            <h3 className="font-semibold text-lg mb-4">الأمان</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <Shield className="w-4 h-4 text-green-500" />
                <span>نظام Escrow آمن</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>تحرير فوري للأموال</span>
              </div>
              <div className="text-xs text-gray-500 mt-4">
                المنصة ليست بنكاً. الأموال محفوظة فقط أثناء دورة الصفقة.
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm">
          <p>© 2026 PALEX – منصة تداول USDT P2P فلسطينية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}