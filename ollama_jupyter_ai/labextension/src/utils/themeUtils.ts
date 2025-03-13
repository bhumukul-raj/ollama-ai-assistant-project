/**
 * @file themeUtils.ts
 * @description This file provides utility functions for handling theme synchronization
 * between the Ollama AI Assistant extension and JupyterLab. It detects the current
 * JupyterLab theme and updates the assistant's styling accordingly.
 */

/**
 * Type definition for theme options
 */
export type ThemeType = 'light' | 'dark' | 'auto';

/**
 * Interface for theme change handler callbacks
 */
interface ThemeListener {
    onThemeChange: (theme: 'light' | 'dark') => void;
}

/**
 * Class to manage theme detection and synchronization with JupyterLab
 */
export class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: 'light' | 'dark' = 'light';
    private listeners: ThemeListener[] = [];
    private themeChangeObserver: MutationObserver | null = null;

    /**
     * Private constructor - use getInstance() to get the singleton instance
     */
    private constructor() {
        this.detectInitialTheme();
        this.setupThemeObserver();
    }

    /**
     * Get singleton instance of ThemeManager
     */
    public static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    /**
     * Detects the initial JupyterLab theme
     */
    private detectInitialTheme(): void {
        // Check for dark theme by looking at JupyterLab body classes
        const isDarkTheme = document.body.classList.contains('jp-mod-dark');
        this.currentTheme = isDarkTheme ? 'dark' : 'light';

        console.log(`[Ollama AI] Initial theme detected: ${this.currentTheme}`);
    }

    /**
     * Sets up MutationObserver to watch for JupyterLab theme changes
     */
    private setupThemeObserver(): void {
        // Target the body element to watch for class changes
        const targetNode = document.body;

        // Configure the observer to watch for class changes
        const config = { attributes: true, attributeFilter: ['class'] };

        // Create an observer instance
        this.themeChangeObserver = new MutationObserver(() => {
            this.onJupyterLabThemeChange();
        });

        // Start observing
        if (targetNode) {
            this.themeChangeObserver.observe(targetNode, config);
        }
    }

    /**
     * Handles theme changes in JupyterLab
     */
    private onJupyterLabThemeChange(): void {
        const isDarkTheme = document.body.classList.contains('jp-mod-dark');
        const newTheme = isDarkTheme ? 'dark' : 'light';

        // Only proceed if theme actually changed
        if (newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            console.log(`[Ollama AI] JupyterLab theme changed to: ${this.currentTheme}`);

            // Notify all registered listeners
            this.notifyListeners();
        }
    }

    /**
     * Notify all registered theme change listeners
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            listener.onThemeChange(this.currentTheme);
        });
    }

    /**
     * Get current theme
     */
    public getCurrentTheme(): 'light' | 'dark' {
        return this.currentTheme;
    }

    /**
     * Register a listener for theme changes
     */
    public addThemeChangeListener(listener: ThemeListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove a previously registered listener
     */
    public removeThemeChangeListener(listener: ThemeListener): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Clean up resources when no longer needed
     */
    public destroy(): void {
        if (this.themeChangeObserver) {
            this.themeChangeObserver.disconnect();
            this.themeChangeObserver = null;
        }
        this.listeners = [];
    }
}

/**
 * Hook-compatible function to get current JupyterLab theme
 */
export const getCurrentTheme = (): 'light' | 'dark' => {
    return ThemeManager.getInstance().getCurrentTheme();
};

export default ThemeManager; 