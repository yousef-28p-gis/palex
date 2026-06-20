/**
 * ملف التوثيق (Validation)
 * يحتوي على دوال التحقق من صحة البيانات
 */

/**
 * التحقق من صحة عنوان محفظة TRC20 (Tron)
 * @param address عنوان المحفظة
 * @returns true إذا كان العنوان صحيحاً
 * @example validateTrc20Address('TXYZ...') // true/false
 */
export const validateTrc20Address = (address: string): boolean => {
  if (!address) return false;
  // عنوان TRC20 يبدأ بـ T ويتكون من 34 حرفاً (أحرف وأرقام)
  const trc20Regex = /^T[A-Za-z0-9]{33}$/;
  return trc20Regex.test(address);
};

/**
 * التحقق من صحة عنوان محفظة BEP20 (Binance Smart Chain)
 * @param address عنوان المحفظة
 * @returns true إذا كان العنوان صحيحاً
 * @example validateBep20Address('0x...') // true/false
 */
export const validateBep20Address = (address: string): boolean => {
  if (!address) return false;
  // عنوان BEP20 يبدأ بـ 0x ويتكون من 42 حرفاً (0x + 40 حرف سداسي عشري)
  const bep20Regex = /^0x[a-fA-F0-9]{40}$/;
  return bep20Regex.test(address);
};

/**
 * التحقق من صحة رقم الجوال الفلسطيني
 * @param phone رقم الجوال
 * @returns true إذا كان الرقم صحيحاً
 * @example validatePhoneNumber('0591234567') // true/false
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  // رقم فلسطيني: يبدأ بـ 05 ويتكون من 10 أرقام
  const phoneRegex = /^05[0-9]{8}$/;
  return phoneRegex.test(phone);
};

/**
 * التحقق من صحة البريد الإلكتروني
 * @param email البريد الإلكتروني
 * @returns true إذا كان البريد صحيحاً
 * @example validateEmail('user@example.com') // true/false
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return emailRegex.test(email);
};

/**
 * التحقق من صحة رقم الهوية (9 أرقام)
 * @param nationalId رقم الهوية
 * @returns true إذا كان الرقم صحيحاً
 */
export const validateNationalId = (nationalId: string): boolean => {
  if (!nationalId) return false;
  const idRegex = /^\d{9}$/;
  return idRegex.test(nationalId);
};

/**
 * التحقق من قوة كلمة المرور
 * @param password كلمة المرور
 * @returns { isValid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('كلمة المرور مطلوبة');
    return { isValid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف كبير (A-Z)');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف صغير (a-z)');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('يجب أن تحتوي على رقم (0-9)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * التحقق من تطابق كلمتي المرور
 * @param password كلمة المرور
 * @param confirmPassword تأكيد كلمة المرور
 * @returns true إذا كانتا متطابقتين
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

/**
 * التحقق من صحة المبلغ (USDT)
 * @param amount المبلغ
 * @param min الحد الأدنى
 * @param max الحد الأقصى
 * @returns true إذا كان المبلغ ضمن النطاق
 */
export const validateAmount = (amount: number, min: number, max: number): boolean => {
  if (isNaN(amount)) return false;
  return amount >= min && amount <= max;
};

/**
 * التحقق من صحة اسم البنك
 * @param bankName اسم البنك
 * @returns true إذا كان الاسم صحيحاً
 */
export const validateBankName = (bankName: string): boolean => {
  const validBanks = [
    'بنك فلسطين',
    'البنك العربي',
    'بنك القدس',
    'البنك الإسلامي الفلسطيني',
    'البنك الوطني',
    'بنك الاستثمار الفلسطيني',
    'بنك القاهرة عمان',
    'البنك التجاري الفلسطيني',
    'بنك الإسكان',
    'بنك الأردن',
    'بنك مصر فلسطين',
    'محفظة بال باي',
  ];
  return validBanks.includes(bankName);
};

/**
 * التحقق من صحة رابط الصورة
 * @param url رابط الصورة
 * @returns true إذا كان الرابط صحيحاً
 */
export const validateImageUrl = (url: string): boolean => {
  if (!url) return false;
  const imageRegex = /\.(jpeg|jpg|png|webp|gif)$/i;
  return imageRegex.test(url);
};

/**
 * التحقق من صحة حجم الملف (بالميجابايت)
 * @param size حجم الملف بالبايت
 * @param maxSizeMB الحد الأقصى بالميجابايت
 * @returns true إذا كان الحجم ضمن الحد المسموح
 */
export const validateFileSize = (size: number, maxSizeMB: number = 5): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

/**
 * التحقق من صحة نوع الملف
 * @param fileType نوع الملف (MIME type)
 * @param allowedTypes قائمة الأنواع المسموحة
 * @returns true إذا كان النوع مسموحاً
 */
export const validateFileType = (fileType: string, allowedTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']): boolean => {
  return allowedTypes.includes(fileType);
};