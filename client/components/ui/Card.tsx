'use client';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, title, subtitle, icon, className = '', hover = false }: CardProps) {
  return (
    <div className={`
      bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden
      transition-all duration-300
      ${hover ? 'hover:shadow-medium hover:-translate-y-1 hover:border-blue-200' : ''}
      ${className}
    `}>
      {(title || subtitle) && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            {icon && <div className="text-blue-600 w-6 h-6">{icon}</div>}
            <div>
              {title && <h3 className="font-bold text-gray-800 text-lg">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}