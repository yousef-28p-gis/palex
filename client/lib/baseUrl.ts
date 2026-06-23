/**
 * قاعدة URL للتطبيق
 * تستخدم في الطلبات المباشرة (fetch) وروابط الصور
 * NEXT_PUBLIC_API_URL هو المسار النسبي /api لأن الـ rewrite يشغله
 */

// ✅ رابط API الأساسي (يستخدم في الـ fetch المباشر)
export const API_BASE = '/api';

// ✅ رابط رفع الملفات والصور
export const MEDIA_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

// ✅ دالة تحويل مسار صورة من الخادم إلى رابط صحيح في المتصفح
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  // إذا كان المسار كامل (http)، نرجعه كما هو
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // إذا كان المسار يبدأ بـ /uploads، نضيف الرابط
  if (path.startsWith('/uploads')) {
    return MEDIA_BASE ? `${MEDIA_BASE}${path}` : path;
  }
  return path;
}
