'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  placeholderHeight?: string;
}

export function LazyLoadSection({ children, className = '', placeholderHeight = '200px' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // IntersectionObserver لتحديد إذا العنصر صار مرئي
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el); // إيقاف المراقبة بعد أول ظهور
        }
      },
      { rootMargin: '100px' } // يبدأ التحميل قبل 100px من الوصول
    );
    
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : <div style={{ height: placeholderHeight }} />}
    </div>
  );
}
