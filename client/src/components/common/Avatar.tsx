import { getInitials } from '@/utils/formatters';

interface AvatarProps {
  name?: string | null;
  email: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

// Generate a consistent color based on the email
function getColorClass(email: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ];

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function Avatar({ name, email, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name, email);
  const colorClass = getColorClass(email);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-medium text-white ${colorClass} ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  );
}
