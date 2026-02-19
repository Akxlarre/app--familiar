import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  viewChild,
  ElementRef,
  HostListener,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { SearchService } from '@core/services/search.service';
import { SearchPanelService } from '@core/services/search-panel.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import type { SearchResult } from '@core/models/search-result.model';

function getResultIcon(type: SearchResult['type']): string {
  switch (type) {
    case 'student':
      return 'pi-user';
    case 'class':
      return 'pi-calendar';
    case 'payment':
      return 'pi-wallet';
    case 'certificate':
      return 'pi-file';
    default:
      return 'pi-circle';
  }
}

@Component({
  selector: 'app-search-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PressFeedbackDirective],
  template: `
    <div class="search-panel">
      <button
        type="button"
        class="search-panel__trigger"
        appPressFeedback
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        [class.search-panel__trigger--open]="isOpen()"
        aria-label="Buscar (Ctrl+K)"
      >
        <i class="pi pi-search text-xl"></i>
      </button>

      @if (isOpen()) {
        <div
          class="search-panel__backdrop"
          (click)="close()"
          aria-hidden="true"
        ></div>
        <div
          #panel
          class="search-panel__dropdown"
          role="dialog"
          aria-label="Panel de búsqueda"
          (keydown)="onPanelKeydown($event)"
        >
          <header class="search-panel__header">
            <h3 class="search-panel__title">Buscar</h3>
            <span class="search-panel__shortcut">Ctrl+K</span>
          </header>

          <div class="search-panel__input-wrap">
            <i class="pi pi-search search-panel__input-icon"></i>
            <input
              #searchInput
              type="search"
              class="search-panel__input"
              [value]="query()"
              (input)="onQueryChange($event)"
              placeholder="Buscar alumnos, clases, pagos..."
              autocomplete="off"
              aria-label="Término de búsqueda"
            />
          </div>

          <div class="search-panel__results">
            @if (query().length > 0) {
              @if (loading()) {
                <div class="search-panel__results-placeholder">
                  <i class="pi pi-spin pi-spinner text-muted"></i>
                  <span>Buscando "{{ query() }}"...</span>
                </div>
              } @else if (hasResults()) {
                <ul class="search-panel__list" role="listbox">
                  @for (result of results(); track result.id; let i = $index) {
                    <li
                      class="search-panel__item"
                      [class.search-panel__item--active]="selectedIndex() === i"
                      (click)="selectResult(result)"
                      role="option"
                      [attr.aria-selected]="selectedIndex() === i"
                    >
                      <i [class]="'pi ' + getIcon(result.type)" class="search-panel__item-icon"></i>
                      <div class="search-panel__item-content">
                        <span class="search-panel__item-title">{{ result.title }}</span>
                        @if (result.subtitle) {
                          <span class="search-panel__item-subtitle">{{ result.subtitle }}</span>
                        }
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <div class="search-panel__results-placeholder">
                  <i class="pi pi-search text-muted"></i>
                  <span>Sin resultados para "{{ query() }}"</span>
                </div>
              }
            } @else {
              <div class="search-panel__empty">
                <i class="pi pi-search text-muted"></i>
                <span>Escribe para buscar</span>
                <span class="search-panel__empty-hint">Alumnos, clases, pagos, certificados</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './search-panel.component.scss',
})
export class SearchPanelComponent {
  private gsap = inject(GsapAnimationsService);
  private searchService = inject(SearchService);
  private searchPanelService = inject(SearchPanelService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  panel = viewChild<ElementRef<HTMLElement>>('panel');
  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  isOpen = signal(false);
  query = signal('');
  selectedIndex = signal(0);

  results = this.searchService.results;
  loading = this.searchService.loading;
  hasResults = this.searchService.hasResults;

  protected readonly getIcon = getResultIcon;

  constructor() {
    effect(() => {
      const requested = this.searchPanelService.openRequested();
      untracked(() => {
        if (requested > 0 && !this.isOpen()) {
          this.toggle();
        }
      });
    });
  }

  toggle(): void {
    const willOpen = !this.isOpen();

    if (willOpen) {
      this.isOpen.set(true);
      this.query.set('');
      this.searchService.clear();
      this.selectedIndex.set(0);
      setTimeout(() => {
        const panelEl = this.panel()?.nativeElement;
        if (panelEl) this.gsap.animatePanelIn(panelEl);
        this.searchInput()?.nativeElement?.focus();
      }, 10);
    } else {
      this.close();
    }
  }

  close(): void {
    if (!this.isOpen()) return;

    const panelEl = this.panel()?.nativeElement;
    if (panelEl) {
      this.gsap.animatePanelOut(panelEl, () => {
        this.isOpen.set(false);
      });
    } else {
      this.isOpen.set(false);
    }
  }

  onQueryChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searchService.search(value);
    this.selectedIndex.set(0);
  }

  onPanelKeydown(event: KeyboardEvent): void {
    const resultsList = this.results();
    if (resultsList.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update((i) => Math.min(i + 1, resultsList.length - 1));
        this.scrollSelectedIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update((i) => Math.max(0, i - 1));
        this.scrollSelectedIntoView();
        break;
      case 'Enter':
        event.preventDefault();
        const selected = resultsList[this.selectedIndex()];
        if (selected) this.selectResult(selected);
        break;
    }
  }

  private scrollSelectedIntoView(): void {
    setTimeout(() => {
      const panelEl = this.panel()?.nativeElement;
      const active = panelEl?.querySelector('.search-panel__item--active');
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  }

  selectResult(result: SearchResult): void {
    this.close();
    if (result.routerLink) {
      this.router.navigateByUrl(result.routerLink);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node;
    const hostEl = this.host.nativeElement;
    const panelEl = this.panel()?.nativeElement;
    const triggerEl = hostEl.querySelector('.search-panel__trigger');
    if (triggerEl?.contains(target) || panelEl?.contains(target)) return;
    this.close();
  }
}
