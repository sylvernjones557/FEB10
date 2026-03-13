import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

// ── Context ────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

// ── Config per type ────────────────────────────────────────────────
const typeConfig = {
    success: {
        icon: CheckCircle2,
        light: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            iconColor: 'text-emerald-600',
            title: 'text-emerald-900',
            message: 'text-emerald-600',
            progress: 'bg-emerald-500',
            shadow: 'shadow-emerald-500/10',
        },
        dark: {
            bg: 'dark:bg-emerald-950/80',
            border: 'dark:border-emerald-800/50',
            iconColor: 'dark:text-emerald-400',
            title: 'dark:text-emerald-100',
            message: 'dark:text-emerald-300',
            progress: 'dark:bg-emerald-400',
            shadow: 'dark:shadow-emerald-500/5',
        }
    },
    error: {
        icon: XCircle,
        light: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            iconColor: 'text-red-600',
            title: 'text-red-900',
            message: 'text-red-600',
            progress: 'bg-red-500',
            shadow: 'shadow-red-500/10',
        },
        dark: {
            bg: 'dark:bg-red-950/80',
            border: 'dark:border-red-800/50',
            iconColor: 'dark:text-red-400',
            title: 'dark:text-red-100',
            message: 'dark:text-red-300',
            progress: 'dark:bg-red-400',
            shadow: 'dark:shadow-red-500/5',
        }
    },
    warning: {
        icon: AlertTriangle,
        light: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            iconColor: 'text-amber-600',
            title: 'text-amber-900',
            message: 'text-amber-600',
            progress: 'bg-amber-500',
            shadow: 'shadow-amber-500/10',
        },
        dark: {
            bg: 'dark:bg-amber-950/80',
            border: 'dark:border-amber-800/50',
            iconColor: 'dark:text-amber-400',
            title: 'dark:text-amber-100',
            message: 'dark:text-amber-300',
            progress: 'dark:bg-amber-400',
            shadow: 'dark:shadow-amber-500/5',
        }
    },
    info: {
        icon: Info,
        light: {
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            iconColor: 'text-indigo-600',
            title: 'text-indigo-900',
            message: 'text-indigo-600',
            progress: 'bg-indigo-500',
            shadow: 'shadow-indigo-500/10',
        },
        dark: {
            bg: 'dark:bg-indigo-950/80',
            border: 'dark:border-indigo-800/50',
            iconColor: 'dark:text-indigo-400',
            title: 'dark:text-indigo-100',
            message: 'dark:text-indigo-300',
            progress: 'dark:bg-indigo-400',
            shadow: 'dark:shadow-indigo-500/5',
        }
    }
};

// ── Single Toast Item ──────────────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [progress, setProgress] = useState(100);
    const config = typeConfig[toast.type];
    const Icon = config.icon;
    const duration = toast.duration || 4000;

    useEffect(() => {
        // Enter animation
        requestAnimationFrame(() => setIsVisible(true));

        // Progress bar
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 50);

        // Auto dismiss
        const timer = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(() => onDismiss(toast.id), 400);
        }, duration);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    const handleDismiss = () => {
        setIsLeaving(true);
        setTimeout(() => onDismiss(toast.id), 400);
    };

    return (
        <div
            className={`
        relative w-full max-w-[380px] overflow-hidden
        rounded-2xl border backdrop-blur-xl
        ${config.light.bg} ${config.dark.bg}
        ${config.light.border} ${config.dark.border}
        ${config.light.shadow} ${config.dark.shadow}
        shadow-2xl
        transition-all duration-500 ease-out
        ${isVisible && !isLeaving
                    ? 'translate-x-0 opacity-100 scale-100'
                    : 'translate-x-[120%] opacity-0 scale-95'
                }
      `}
        >
            <div className="flex items-start gap-3.5 p-4 pr-10">
                {/* Icon */}
                <div className={`shrink-0 mt-0.5 ${config.light.iconColor} ${config.dark.iconColor}`}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-black tracking-tight leading-tight ${config.light.title} ${config.dark.title}`}>
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p className={`text-[11px] font-semibold mt-1 leading-snug opacity-80 ${config.light.message} ${config.dark.message}`}>
                            {toast.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Close button */}
            <button
                onClick={handleDismiss}
                className="absolute top-3.5 right-3 p-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
            >
                <X size={14} strokeWidth={3} />
            </button>

            {/* Progress bar */}
            <div className="h-[3px] w-full bg-black/5 dark:bg-white/5">
                <div
                    className={`h-full ${config.light.progress} ${config.dark.progress} transition-all duration-100 ease-linear rounded-full opacity-60`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

// ── Confirm Dialog ─────────────────────────────────────────────────
interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

const ConfirmDialog: React.FC<{ state: ConfirmState; onClose: () => void }> = ({ state, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (state.isOpen) {
            requestAnimationFrame(() => setIsVisible(true));
        }
    }, [state.isOpen]);

    if (!state.isOpen) return null;

    const handleConfirm = () => {
        setIsVisible(false);
        setTimeout(() => {
            state.onConfirm();
            onClose();
        }, 300);
    };

    const handleCancel = () => {
        setIsVisible(false);
        setTimeout(() => onClose(), 300);
    };

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent'}`}>
            <div
                className={`
          w-full max-w-[340px]
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-800
          rounded-[2rem] shadow-2xl
          p-8 text-center
          transition-all duration-300 ease-out
          ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'}
        `}
            >
                {/* Warning icon */}
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-red-500 dark:text-red-400" strokeWidth={2.5} />
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {state.title}
                </h3>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                    {state.message}
                </p>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={handleCancel}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 transition-all active:scale-95"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Toast Provider ─────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { id, type, title, message, duration }]);
    }, []);

    const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
        setConfirmState({ isOpen: true, title, message, onConfirm });
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Toast container — top right */}
            <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onDismiss={dismissToast} />
                    </div>
                ))}
            </div>

            {/* Confirm dialog */}
            <ConfirmDialog state={confirmState} onClose={closeConfirm} />
        </ToastContext.Provider>
    );
};
