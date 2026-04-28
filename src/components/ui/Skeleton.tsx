import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangle', 
  width, 
  height 
}) => {
  const baseClasses = 'animate-pulse bg-slate-200';
  const variantClasses = {
    rectangle: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-md h-4 w-full mb-2',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={300} height={16} />
        </div>
        <Skeleton variant="circle" width={40} height={40} />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={100} className="rounded-3xl" />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton height={400} className="rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton height={200} className="rounded-3xl" />
          <Skeleton height={200} className="rounded-3xl" />
        </div>
      </div>
    </div>
  );
};

export const FileSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-8">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="circle" width={40} height={40} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <Skeleton key={i} height={120} className="rounded-2xl" />
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-50 flex gap-4">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="text" width="15%" />)}
      </div>
      <div className="p-4 space-y-4">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4">
            {[1, 2, 3, 4, 5].map(j => <Skeleton key={j} variant="text" width="15%" />)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const KanbanSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton variant="text" width={100} height={20} />
          <Skeleton height={150} className="rounded-2xl" />
          <Skeleton height={150} className="rounded-2xl" />
        </div>
      ))}
    </div>
  );
};
