'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BackButtonProps {
  defaultHref?: string;
  label?: string;
}

export function BackButton({ defaultHref = '/dashboard', label = 'رجوع' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(defaultHref);
    }
  };

  return (
    <Button variant="outline" onClick={handleBack} className="gap-2">
      <ArrowRight className="w-4 h-4" />
      {label}
    </Button>
  );
}