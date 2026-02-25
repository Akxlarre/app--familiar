import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GsapAnimationsService } from './gsap-animations.service';

export type Theme = 'red' | 'blue';
export type ColorMode = 'light' | 'dark';

/**
 * ThemeService - Gestión de tema de color y modo claro/oscuro
 *
 * Temas de color: 'red' (Escuela A) | 'blue' (Escuela B)
 * Modos:          'light' (por defecto) | 'dark'
 *
 * El modo oscuro se aplica con [data-mode='dark'] en el documentElement.
 * El tema de color se aplica con [data-theme='red|blue'].
 *
 * Uso:
 * ```typescript
 * readonly themeService = inject(ThemeService);
 * readonly theme    = this.themeService.theme;    // Signal<'red' | 'blue'>
 * readonly darkMode = this.themeService.darkMode; // Signal<boolean>
 *
 * this.themeService.setTheme('blue');
 * this.themeService.toggleDarkMode();
 * ```
 */
@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private platformId = inject(PLATFORM_ID);
    private gsap = inject(GsapAnimationsService);

    private readonly STORAGE_KEY_THEME = 'app-theme';
    private readonly STORAGE_KEY_MODE = 'app-color-mode';
    private readonly DEFAULT_THEME: Theme = 'red';

    /** Tema de color activo */
    readonly theme = signal<Theme>(this.DEFAULT_THEME);

    /** Si el modo oscuro está activo */
    readonly darkMode = signal<boolean>(false);

    constructor() {
        this.initializeTheme();
        this.initializeDarkMode();
    }

    // ─── Tema de Color ────────────────────────────────────────────────────────

    private initializeTheme(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const saved = this.loadFromStorage(this.STORAGE_KEY_THEME);
        const initial = (saved === 'red' || saved === 'blue' ? saved : this.DEFAULT_THEME) as Theme;
        this.applyThemeToDOM(initial);
        this.theme.set(initial);
    }

    /**
     * Cambia el tema de color con animación GSAP opcional.
     * @param newTheme - 'red' | 'blue'
     * @param animate  - Usar fade transition (default: true)
     */
    setTheme(newTheme: Theme, animate: boolean = true): void {
        if (!isPlatformBrowser(this.platformId)) return;
        if (this.theme() === newTheme) return;

        if (animate) {
            this.gsap.animateThemeChange(() => this.applyTheme(newTheme));
        } else {
            this.applyTheme(newTheme);
        }
    }

    private applyTheme(newTheme: Theme): void {
        this.theme.set(newTheme);
        this.applyThemeToDOM(newTheme);
        this.saveToStorage(this.STORAGE_KEY_THEME, newTheme);
    }

    private applyThemeToDOM(theme: Theme): void {
        if (!isPlatformBrowser(this.platformId)) return;
        document.documentElement.setAttribute('data-theme', theme);
    }

    getThemeDisplayName(theme?: Theme): string {
        const t = theme || this.theme();
        return t === 'red' ? 'Escuela A' : 'Escuela B';
    }

    // ─── Modo Oscuro / Claro ─────────────────────────────────────────────────

    private initializeDarkMode(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        // Respeta preferencia del sistema si no hay preferencia guardada
        const saved = this.loadFromStorage(this.STORAGE_KEY_MODE);
        let isDark: boolean;

        if (saved === 'dark') {
            isDark = true;
        } else if (saved === 'light') {
            isDark = false;
        } else {
            // Sin preferencia guardada → usar preferencia del sistema operativo
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        this.applyDarkModeToDOM(isDark);
        this.darkMode.set(isDark);
    }

    /**
     * Alterna entre modo claro y oscuro con animación suave.
     */
    toggleDarkMode(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const newMode = !this.darkMode();
        this.gsap.animateThemeChange(() => {
            this.darkMode.set(newMode);
            this.applyDarkModeToDOM(newMode);
            this.saveToStorage(this.STORAGE_KEY_MODE, newMode ? 'dark' : 'light');
        });
    }

    /**
     * Establece el modo explícitamente.
     * @param mode - 'light' | 'dark'
     */
    setColorMode(mode: ColorMode): void {
        if (!isPlatformBrowser(this.platformId)) return;
        const isDark = mode === 'dark';
        if (this.darkMode() === isDark) return;
        this.gsap.animateThemeChange(() => {
            this.darkMode.set(isDark);
            this.applyDarkModeToDOM(isDark);
            this.saveToStorage(this.STORAGE_KEY_MODE, mode);
        });
    }

    private applyDarkModeToDOM(isDark: boolean): void {
        if (!isPlatformBrowser(this.platformId)) return;
        if (isDark) {
            document.documentElement.setAttribute('data-mode', 'dark');
        } else {
            document.documentElement.removeAttribute('data-mode');
        }
    }

    // ─── Utilidades ──────────────────────────────────────────────────────────

    private loadFromStorage(key: string): string | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        return localStorage.getItem(key);
    }

    private saveToStorage(key: string, value: string): void {
        if (!isPlatformBrowser(this.platformId)) return;
        localStorage.setItem(key, value);
    }
}
