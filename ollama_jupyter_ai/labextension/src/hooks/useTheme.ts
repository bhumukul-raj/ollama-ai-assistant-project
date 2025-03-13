/**
 * @file useTheme.ts
 * @description Custom React hook for synchronizing with JupyterLab's theme system.
 * This hook allows components to react to theme changes in JupyterLab.
 */
import { useState, useEffect } from 'react';
import { ThemeManager } from '../utils/themeUtils';

/**
 * Custom hook that subscribes to JupyterLab theme changes
 * and provides the current theme to React components.
 * 
 * @returns An object containing:
 *   - theme: The current theme ('light' or 'dark')
 *   - isDarkTheme: Boolean indicating if the current theme is dark
 */
export const useTheme = () => {
    // Initialize with the current theme from ThemeManager
    const [theme, setTheme] = useState<'light' | 'dark'>(
        ThemeManager.getInstance().getCurrentTheme()
    );

    useEffect(() => {
        const themeManager = ThemeManager.getInstance();

        // Listener object that will update our state
        const themeListener = {
            onThemeChange: (newTheme: 'light' | 'dark') => {
                setTheme(newTheme);
            }
        };

        // Register our listener
        themeManager.addThemeChangeListener(themeListener);

        // Cleanup function to remove the listener when component unmounts
        return () => {
            themeManager.removeThemeChangeListener(themeListener);
        };
    }, []);

    return {
        theme,
        isDarkTheme: theme === 'dark'
    };
};

export default useTheme; 