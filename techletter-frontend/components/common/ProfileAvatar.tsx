interface ProfileAvatarProps {
  nickname?: string | null;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-14 w-14 text-xl',
};

export default function ProfileAvatar({
  nickname,
  imageUrl,
  size = 'md',
  className = '',
}: ProfileAvatarProps) {
  const initial = nickname?.trim()?.[0]?.toUpperCase() || 'U';
  const trimmedImageUrl = imageUrl?.trim();

  return (
    <div
      className={`${sizeClass[size]} flex shrink-0 items-center justify-center rounded-full bg-blue-600 bg-cover bg-center font-bold text-white shadow-sm ${className}`}
      style={trimmedImageUrl ? { backgroundImage: `url("${trimmedImageUrl}")` } : undefined}
      aria-hidden="true"
    >
      {!trimmedImageUrl && initial}
    </div>
  );
}
