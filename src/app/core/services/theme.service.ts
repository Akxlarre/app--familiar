import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GsapAnimationsService } from './gsap-animations.service';

export type Theme = 'red' | 'blue';

/**
 * ThemeService - Dual-theme management for Escuela A (red) and Escuela B (blue)
 *
 * Usage:
 * ```typescript
 * readonly themeService = inject(ThemeService);
 * readonly theme = this.themeService.theme; // Signal<'red' | 'blue'>
 *
 * // Change theme
 * this.themeService.setTheme('blue');
 * ```
 */
@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private platformId = inject(PLATFORM_ID);
    private gsap = inject(GsapAnimationsService);
    private readonly STORAGE_KEY = 'app-theme';
    private readonly DEFAULT_THEME: Theme = 'red';

    /**
     * Current active theme signal
     * Subscribe to this in components to react to theme changes
     */
    readonly theme = signal<Theme>(this.DEFAULT_THEME);

    constructor() {
        this.initializeTheme();
    }

    /**
     * Initialize theme from localStorage or use default
     * Only runs in browser context
     */
    private initializeTheme(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const savedTheme = this.loadThemeFromStorage();
        const initialTheme = savedTheme || this.DEFAULT_THEME;

        this.applyThemeToDOM(initialTheme);
        this.theme.set(initialTheme);
    }

    /**
     * Change the active theme with optional GSAP animation
     * @param newTheme - 'red' or 'blue'
     * @param animate - Whether to use smooth fade transition (default: true)
     */
    setTheme(newTheme: Theme, animate: boolean = true): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (this.theme() === newTheme) {
            return; // No change needed
        }

        if (animate) {
            this.gsap.animateThemeChange(() => this.applyTheme(newTheme));
        } else {
            this.applyTheme(newTheme);
        }
    }

    /**
     * Apply theme change without animation
     */
    private applyTheme(newTheme: Theme): void {
        this.theme.set(newTheme);
        this.applyThemeToDOM(newTheme);
        this.saveThemeToStorage(newTheme);
    }

    /**
     * Update HTML data-theme attribute
     */
    private applyThemeToDOM(theme: Theme): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Load theme from localStorage
     */
    private loadThemeFromStorage(): Theme | null {
        if (!isPlatformBrowser(this.platformId)) {
            return null;
        }

        const saved = localStorage.getItem(this.STORAGE_KEY);
        return saved === 'red' || saved === 'blue' ? saved : null;
    }

    /**
     * Save theme to localStorage
     */
    private saveThemeToStorage(theme: Theme): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        localStorage.setItem(this.STORAGE_KEY, theme);
    }

    /**
     * Get theme display name for UI
     */
    getThemeDisplayName(theme?: Theme): string {
        const t = theme || this.theme();
        return t === 'red' ? 'Escuela A' : 'Escuela B';
    }
}
