'use client';

import { MessageCircle } from 'lucide-react';

export function WhatsAppButton() {
  const phoneNumber = '9705991234567'; // رقمك مع رمز الدولة بدون +
  const message = encodeURIComponent('مرحباً، أحتاج مساعدة في منصة PALEX');
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
      title="الدعم الفني عبر واتساب"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
}