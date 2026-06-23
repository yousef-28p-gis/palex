'use client';

// ✅ مدير الصوت - يستخدم Web Audio API لتوليد أصوات مباشرة (بدون روابط خارجية)
class SoundManager {
  private static ctx: AudioContext | null = null;
  private static isUnlocked = false;

  // ✅ الحصول على AudioContext (يحتاج تفاعل مستخدم لأول مرة)
  private static getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!SoundManager.ctx) {
      SoundManager.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return SoundManager.ctx;
  }

  // ✅ فتح الصوت (مطلوب لأول تفاعل مع المستخدم)
  static unlock() {
    if (SoundManager.isUnlocked) return;
    SoundManager.isUnlocked = true;
    const ctx = SoundManager.getCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  // ✅ لا حاجة لـ preload — Web Audio API لا يحتاج تحميل مسبق
  static preload() {
    // no-op: الأصوات تتولد مباشرة عند الطلب
  }

  // ✅ تشغيل صوت مبرمج (beep/bell)
  static play(type: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = SoundManager.getCtx();
        if (!ctx || ctx.state === 'suspended') {
          resolve(); // الصوت مش متاح نرجعه
          return;
        }

        // ✅ تكوين الصوت حسب النوع
        const config = SoundManager.getSoundConfig(type);
        if (!config) {
          resolve();
          return;
        }

        const { frequencies, duration, type: waveType } = config;

        // إنشاء العقد الصوتية
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime); // volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        gainNode.connect(ctx.destination);

        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = waveType;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
          osc.connect(gainNode);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + duration);
        });

        setTimeout(resolve, duration * 1000 + 200);
      } catch {
        resolve(); // أي خطأ — نتجاهل بصمت
      }
    });
  }

  private static getSoundConfig(type: string): { frequencies: number[]; duration: number; type: OscillatorType } | null {
    switch (type) {
      case 'deposit':
        return { frequencies: [800, 1000], duration: 0.2, type: 'sine' };
      case 'proof':
        return { frequencies: [600, 750], duration: 0.2, type: 'sine' };
      case 'confirmed':
        return { frequencies: [523, 659, 784], duration: 0.15, type: 'sine' }; // C E G
      case 'pending':
        return { frequencies: [440], duration: 0.3, type: 'sine' };
      case 'error':
        return { frequencies: [200, 150], duration: 0.3, type: 'sawtooth' };
      case 'success':
        return { frequencies: [523, 784], duration: 0.2, type: 'sine' }; // C G
      case 'online':
        return { frequencies: [660, 880], duration: 0.15, type: 'sine' };
      case 'offline':
        return { frequencies: [880, 660], duration: 0.15, type: 'sine' };
      case 'new_trade':
        return { frequencies: [523, 659, 784, 1047], duration: 0.15, type: 'sine' }; // C E G C (صاعد)
      default:
        return null;
    }
  }
}

export default SoundManager;
