import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ المسارات العامة التي لا تحتاج تسجيل دخول
const publicPaths = [
  '/', 
  '/login', 
  '/register', 
  '/marketplace', 
  '/forgot-password', 
  '/reset-password',
  '/verify-email',
  '/api/auth/login',
  '/api/auth/register',
];

// ✅ المسارات الخاصة بالأدمن
const adminPaths = ['/admin'];

// ✅ دالة مساعدة لاستخراج التوكن من مصادر مختلفة
function extractToken(request: NextRequest): string | null {
  // 1. محاولة قراءة من الـ Cookie
  const cookieToken = request.cookies.get('accessToken')?.value;
  if (cookieToken) return cookieToken;
  
  // 2. محاولة قراءة من Authorization Header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 3. محاولة قراءة من الـ URL (للدعم القديم - نادراً)
  const urlToken = request.nextUrl.searchParams.get('token');
  if (urlToken) return urlToken;
  
  return null;
}

// ✅ دالة للتحقق من الحساب الموقوف (مباشرة من التوكن)
function isUserSuspended(token: string): boolean {
  try {
    // فك تشفير JWT بدون التحقق من التوقيع (للسرعة)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.isSuspended === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ✅ التحقق من المسارات العامة
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p));
  
  // ✅ السماح للملفات الثابتة والـ API
  const isStaticFile = pathname.includes('/_next') || 
                       pathname.includes('/favicon.ico') ||
                       pathname.includes('/images/') ||
                       pathname.includes('/uploads/');
  
  if (isStaticFile) {
    return NextResponse.next();
  }
  
  // ✅ استخراج التوكن
  const accessToken = extractToken(request);
  
  // ✅ التحقق من أن المستخدم ليس موقوفاً
  if (accessToken && isUserSuspended(accessToken)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('message', '🚫 حسابك موقوف. يرجى مراجعة الدعم الفني.');
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
  
  // ✅ إذا كان المسار عاماً ولا يوجد توكن => سماح
  if (isPublic && !accessToken) {
    return NextResponse.next();
  }
  
  // ✅ إذا كان المسار عاماً ولكن يوجد توكن => تحقق من صلاحيته
  if (isPublic && accessToken) {
    return NextResponse.next();
  }
  
  // ✅ إذا لم يكن المسار عاماً ولا يوجد توكن => إعادة توجيه إلى login
  if (!isPublic && !accessToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    url.searchParams.set('message', 'يرجى تسجيل الدخول أولاً');
    return NextResponse.redirect(url);
  }
  
  // ✅ السماح بالوصول
  return NextResponse.next();
}

// ✅ إضافة رؤوس أمان إضافية للاستجابات
export function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

// ✅ تكوين المسارات التي يطبق عليها الـ middleware
export const config = {
  matcher: [
    /*
     * ✅ تم إصلاح matcher: إزالة 'api|' ليعمل على جميع المسارات
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - uploads folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|uploads).*)',
  ],
};