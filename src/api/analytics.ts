export type AnalyticsEvent =
    | 'game_start'
    | 'game_over'
    | 'level_up'
    | 'submit_score'
    | 'feedback_open'
    | 'tutorial_start'
    | 'tutorial_complete';

declare global {
    interface Window {
        gtag: (
            command: 'event' | 'config' | 'js' | 'set',
            targetId: string,
            config?: Record<string, any>
        ) => void;
    }
}

export function sendEvent(eventName: AnalyticsEvent, params?: Record<string, any>): void {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
    } else {

    }
}
