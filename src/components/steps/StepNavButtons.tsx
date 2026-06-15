'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCotizadorStore } from '@/lib/store';

interface StepNavButtonsProps {
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  showBack?: boolean;
}

export function StepNavButtons({
  onNext,
  nextLabel = 'Siguiente',
  nextDisabled,
  loading,
  showBack = true,
}: StepNavButtonsProps) {
  const back = useCotizadorStore((s) => s.back);
  const next = useCotizadorStore((s) => s.next);
  const step = useCotizadorStore((s) => s.step);

  return (
    <>
      <div>
        {showBack && step > 1 && (
          <Button type="button" variant="ghost" onClick={back}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        )}
      </div>
      <Button
        type="button"
        variant="primary"
        disabled={nextDisabled}
        loading={loading}
        onClick={() => {
          if (onNext) onNext();
          else next();
        }}
      >
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </>
  );
}
