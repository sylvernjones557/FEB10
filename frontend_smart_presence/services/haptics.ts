import { WebHaptics } from 'web-haptics';

// Initialize the haptics engine once
const engine = typeof window !== 'undefined' ? new WebHaptics() : null;

/**
 * Tactical feedback (haptics) for the mobile PWA.
 * Wraps web-haptics to provide consistent feels across the app.
 */
export const haptics = {
    // Navigation & Buttons
    impactLight: () => engine?.trigger('light'),
    impactMedium: () => engine?.trigger('medium'),
    impactHeavy: () => engine?.trigger('heavy'),

    // Selections (Sliders, Toggles, List Items)
    selection: () => engine?.trigger('selection'),

    // Process Results
    notificationSuccess: () => engine?.trigger('success'),
    notificationWarning: () => engine?.trigger('warning'),
    notificationError: () => engine?.trigger('error'),

    // Custom Patterns/Trigger
    trigger: (pattern: any) => engine?.trigger(pattern),

    // Browser Native fallback directly
    vibrate: (pattern: number | number[]) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
};

export default haptics;
