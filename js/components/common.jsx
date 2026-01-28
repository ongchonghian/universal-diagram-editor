import React from 'react';

// Common UI Components

export const Button = ({ onClick, children, variant = "primary", icon, className = "", disabled = false, size = "md", title }) => {
    const baseClass = "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const sizes = { xs: "px-2 py-1 text-xs", sm: "px-2.5 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
    const variants = {
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
        secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-indigo-500",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        danger: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
        warning: "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
    };
    return (
        <button onClick={onClick} disabled={disabled} title={title} className={`${baseClass} ${sizes[size]} ${variants[variant]} ${className}`}>
            {icon && <i className={`${icon} ${children ? 'mr-2' : ''}`}></i>}
            {children}
        </button>
    );
};

export const LogoLoader = ({ size = "md", text = "Loading..." }) => (
    <div className="flex flex-col items-center justify-center">
        <div className={`relative ${size === 'lg' ? 'w-16 h-16' : 'w-8 h-8'} animate-spin`}>
            <img src="Universal Diagram Editor.png" alt="" className="w-full h-full opacity-80" />
        </div>
        {text && <span className="mt-2 text-xs text-slate-500 font-medium">{text}</span>}
    </div>
);

export const StatusBadge = ({ type, text }) => {
    const colors = {
        success: "bg-green-100 text-green-700",
        error: "bg-red-100 text-red-700",
        warning: "bg-amber-100 text-amber-700",
        info: "bg-blue-100 text-blue-700",
        neutral: "bg-slate-100 text-slate-700"
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[type] || colors.neutral}`}>
            {text}
        </span>
    );
};
