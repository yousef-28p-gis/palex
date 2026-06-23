'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  consequences?: string[];
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  consequences,
  confirmText = 'تأكيد',
  cancelText = 'رجوع',
  variant = 'warning',
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: 'bg-red-500/20 text-red-400',
      button: 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600',
      border: 'border-red-500/50',
    },
    warning: {
      icon: 'bg-yellow-500/20 text-yellow-400',
      button: 'from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600',
      border: 'border-yellow-500/50',
    },
    info: {
      icon: 'bg-blue-500/20 text-blue-400',
      button: 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600',
      border: 'border-blue-500/50',
    },
  };

  const style = variants[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-md bg-gradient-to-br from-slate-800/95 via-blue-900/95 to-slate-900/95 backdrop-blur-xl rounded-2xl border ${style.border} shadow-2xl overflow-hidden`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center pt-8 pb-2">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${style.icon}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center px-6">
          {title}
        </h3>

        {/* Message */}
        <p className="text-blue-200 text-sm text-center mt-2 px-6">
          {message}
        </p>

        {/* Consequences */}
        {consequences && consequences.length > 0 && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-blue-300 font-semibold mb-2">🚨 العواقب:</p>
            <ul className="space-y-1.5">
              {consequences.map((item, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 p-6">
          <Button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            loading={isLoading}
            className={`flex-1 bg-gradient-to-r ${style.button} text-white border-0`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
