import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
    hoverEffect?: boolean;
    onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    noPadding = false,
    hoverEffect = false,
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className={`
        bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl text-white shadow-xl
        ${noPadding ? '' : 'p-6'}
        ${hoverEffect ? 'transition-all duration-300 hover:scale-[1.01] hover:bg-white/10 hover:border-white/20 cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
};

export default GlassCard;
