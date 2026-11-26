import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Common UI Components
//
// The app's visual rules, in one place:
// - one accent (indigo) for primary actions and the selected state; slate for everything else;
//   emerald, amber and red only for status
// - radii: controls 6px (rounded-md), cards and panels 8px (rounded-lg), dialogs 12px (rounded-xl)
// - type: 12px controls and secondary text, 13px panel body, 14px chat and dialog body, 15px titles

const BUTTON_BASE = "inline-flex items-center justify-center gap-1.5 font-medium rounded-md whitespace-nowrap transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";
const BUTTON_SIZES = {
    xs: "h-6 px-2 text-xs",
    sm: "h-7 px-2.5 text-xs",
    md: "h-8 px-3 text-[13px]",
    lg: "h-9 px-4 text-sm"
};
const BUTTON_VARIANTS = {
    primary: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm",
    secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
    warning: "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
};

/** Class names for a button, for places that render their own <button> or <a>. */
export const buttonClass = ({ variant = 'secondary', size = 'md', className = '' } = {}) =>
    `${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`;

/**
 * A button. `label` hides the text below a breakpoint: pass `collapse="xl"` and the text shows
 * only from that width up, while the icon stays and the text remains the accessible name.
 */
export const Button = ({ onClick, children, variant = "primary", icon, className = "", disabled = false, size = "md", title, collapse, type = "button", ...rest }) => {
    const hideText = collapse ? { sm: 'hidden sm:inline', md: 'hidden md:inline', lg: 'hidden lg:inline', xl: 'hidden xl:inline' }[collapse] : '';
    const ariaLabel = rest['aria-label'] || (collapse && typeof children === 'string' ? children : undefined);
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            title={title || (collapse && typeof children === 'string' ? children : undefined)}
            className={`${buttonClass({ variant, size })} ${className}`}
            {...rest}
            aria-label={ariaLabel}
        >
            {icon && <i className={`${icon} text-[0.95em] w-3.5 text-center`} aria-hidden="true"></i>}
            {children && <span className={hideText}>{children}</span>}
        </button>
    );
};

/** A square button that shows only an icon. `label` is required: it is the accessible name and the tooltip. */
export const IconButton = ({ icon, label, onClick, disabled = false, pressed, className = "", size = "md", title, ...rest }) => {
    const box = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-[13px]';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            title={title || label}
            className={`inline-flex items-center justify-center ${box} rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:pointer-events-none ${pressed ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'} ${className}`}
            {...rest}
        >
            <i className={icon} aria-hidden="true"></i>
        </button>
    );
};

/** A small inline spinner with optional text, sized to sit inside a line without moving it. */
export const Spinner = ({ text, className = "" }) => (
    <span className={`inline-flex items-center gap-1.5 text-xs text-slate-500 ${className}`} role="status">
        <span className="ui-spinner" aria-hidden="true"></span>
        {text && <span>{text}</span>}
    </span>
);

export const LogoLoader = ({ size = "md", text = "Loading..." }) => (
    <div className="flex flex-col items-center justify-center">
        <div className={`relative ${size === 'lg' ? 'w-16 h-16' : 'w-8 h-8'} animate-spin`}>
            <img src="Universal Diagram Editor.png" alt="" className="w-full h-full opacity-80" />
        </div>
        {text && <span className="mt-2 text-xs text-slate-500 font-medium">{text}</span>}
    </div>
);

export const StatusBadge = ({ type, text, className = "" }) => {
    const colors = {
        success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        error: "bg-red-50 text-red-700 ring-red-200",
        warning: "bg-amber-50 text-amber-800 ring-amber-200",
        info: "bg-slate-50 text-slate-600 ring-slate-200",
        neutral: "bg-slate-50 text-slate-600 ring-slate-200"
    };
    return (
        <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${colors[type] || colors.neutral} ${className}`}>
            {text}
        </span>
    );
};

/** The same divider everywhere a toolbar separates groups. */
export const ToolbarDivider = ({ className = "" }) => (
    <span className={`w-px h-5 bg-slate-200 mx-1 shrink-0 ${className}`} aria-hidden="true"></span>
);

/**
 * The frame every dialog shares: a dimmed backdrop and a centred panel, rendered at the top of the page
 * so that a panel elsewhere (such as Syntext Smith's) can never cover the dialog.
 * Escape closes the dialog, and so does a click on the backdrop when `closeOnBackdrop` is true.
 */
export const Modal = ({ onClose, labelledBy, className = "max-w-md", closeOnBackdrop = true, z = "z-50", children }) => {
    useEffect(() => {
        if (!onClose) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div className={`fixed inset-0 ${z} flex items-center justify-center p-4`}>
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
                onClick={closeOnBackdrop ? onClose || undefined : undefined}
                aria-hidden="true"
            ></div>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                className={`relative w-full bg-white rounded-xl shadow-2xl ring-1 ring-slate-900/5 flex flex-col overflow-hidden animate-dialog ${className}`}
            >
                {children}
            </div>
        </div>,
        document.body
    );
};

/** A dialog's title row: an optional icon, the title, an optional line under the title, and the close button. */
export const ModalHeader = ({ id, icon, title, subtitle, onClose, closeLabel = "Close", tone = "indigo", children }) => {
    const iconTone = { indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-100 text-slate-600' }[tone];
    return (
        <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100 shrink-0">
            {icon && (
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${iconTone}`} aria-hidden="true">
                    <i className={icon}></i>
                </span>
            )}
            <div className="min-w-0 flex-1">
                <h3 id={id} className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 leading-tight mt-0.5 truncate">{subtitle}</p>}
            </div>
            {children}
            {onClose && <IconButton icon="fas fa-times" label={closeLabel} onClick={onClose} />}
        </div>
    );
};

/** A dialog's button row. */
export const ModalFooter = ({ children, className = "" }) => (
    <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/70 shrink-0 ${className}`}>
        {children}
    </div>
);

/** A label above a form field, in sentence case. */
export const FieldLabel = ({ htmlFor, children, className = "" }) => (
    <label htmlFor={htmlFor} className={`block text-xs font-medium text-slate-700 mb-1.5 ${className}`}>{children}</label>
);

export const inputClass = 'w-full h-9 px-3 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-md shadow-sm transition-colors focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20';
