// Shared UI Components
import { html } from '../react-helpers.js';

/**
 * Reusable Button component with variants
 * @param {Object} props
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - primary|secondary|ghost|danger|warning
 * @param {string} props.icon - FontAwesome icon class
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.size - xs|sm|md|lg
 * @param {string} props.title - Tooltip text
 * @param {*} props.children - Button content
 */
export const Button = ({ onClick, children, variant = "primary", icon, className = "", disabled = false, size = "md", title }) => {
    const baseClass = "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const sizes = { 
        xs: "px-2 py-1 text-xs", 
        sm: "px-2.5 py-1.5 text-xs", 
        md: "px-4 py-2 text-sm", 
        lg: "px-6 py-3 text-base" 
    };
    
    const variants = {
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
        secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-indigo-500",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        danger: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200",
        warning: "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
    };
    
    return html`
        <button 
            onClick=${onClick} 
            disabled=${disabled} 
            title=${title} 
            className=${`${baseClass} ${sizes[size]} ${variants[variant]} ${className}`}
        >
            ${icon && html`<i className=${`${icon} ${children ? 'mr-2' : ''}`}></i>`}
            ${children}
        </button>
    `;
};

/**
 * Status badge for displaying state indicators
 * @param {Object} props
 * @param {string} props.type - success|warning|info|error
 * @param {string} props.text - Badge text
 */
export const StatusBadge = ({ type, text }) => {
    const styles = {
        success: "bg-emerald-100 text-emerald-800 border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border-amber-200",
        info: "bg-blue-100 text-blue-800 border-blue-200",
        error: "bg-red-100 text-red-800 border-red-200"
    };
    
    return html`
        <span className=${`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.info}`}>
            ${text}
        </span>
    `;
};

/**
 * Loading spinner component
 */
export const Loader = ({ size = "md", className = "" }) => {
    const sizes = {
        sm: "w-4 h-4 border-2",
        md: "w-6 h-6 border-3",
        lg: "w-8 h-8 border-4"
    };
    
    return html`
        <div className=${`loader ${sizes[size]} ${className}`}></div>
    `;
};

/**
 * Empty state placeholder
 * @param {Object} props
 * @param {string} props.icon - FontAwesome icon class
 * @param {string} props.title - Title text
 * @param {string} props.description - Description text
 */
export const EmptyState = ({ icon, title, description, children }) => {
    return html`
        <div className="flex flex-col items-center justify-center p-8 text-center">
            ${icon && html`<i className=${`${icon} text-4xl text-slate-300 mb-4`}></i>`}
            ${title && html`<h3 className="text-lg font-medium text-slate-600 mb-2">${title}</h3>`}
            ${description && html`<p className="text-sm text-slate-500 mb-4">${description}</p>`}
            ${children}
        </div>
    `;
};

/**
 * Section header with optional action button
 */
export const SectionHeader = ({ title, action, actionIcon, onAction }) => {
    return html`
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">${title}</h3>
            ${action && html`
                <button 
                    onClick=${onAction}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                    ${actionIcon && html`<i className=${actionIcon}></i>`}
                    ${action}
                </button>
            `}
        </div>
    `;
};

/**
 * Inline editable text field
 */
export const EditableText = ({ value, onSave, placeholder = "Click to edit" }) => {
    const [isEditing, setIsEditing] = window.React.useState(false);
    const [editValue, setEditValue] = window.React.useState(value);
    const inputRef = window.React.useRef(null);
    
    window.React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    
    const handleSave = () => {
        setIsEditing(false);
        if (editValue !== value) {
            onSave(editValue);
        }
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
        }
    };
    
    if (isEditing) {
        return html`
            <input
                ref=${inputRef}
                type="text"
                value=${editValue}
                onChange=${(e) => setEditValue(e.target.value)}
                onBlur=${handleSave}
                onKeyDown=${handleKeyDown}
                className="inline-edit-input w-full"
            />
        `;
    }
    
    return html`
        <span 
            className="cursor-pointer hover:text-indigo-600"
            onDoubleClick=${() => setIsEditing(true)}
            title="Double-click to edit"
        >
            ${value || placeholder}
        </span>
    `;
};
