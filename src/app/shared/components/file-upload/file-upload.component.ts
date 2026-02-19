import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  signal,
  computed,
  viewChild,
  ElementRef,
  AfterViewInit,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';

/**
 * FileUpload UX Premium 2026 — dropzone con dragover/dragleave,
 * templates, hint calculado, animaciones GSAP.
 */
@Component({
  selector: 'app-file-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="file-upload-premium"
      [class.file-upload-premium--drag-over]="isDragOver()"
      [class.file-upload-premium--has-files]="files().length > 0"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
    >
      @if (files().length === 0) {
        <div
          #emptyZone
          class="file-upload-premium__empty"
          role="button"
          tabindex="0"
          [attr.aria-label]="chooseLabel()"
          (click)="onEmptyClick()"
          (keydown)="onEmptyKeydown($event)"
        >
          <ng-content select="[header]" />
          <div class="file-upload-premium__empty-inner">
            <i [class]="'pi ' + (chooseIcon() || 'pi-upload') + ' file-upload-premium__icon'"></i>
            <p class="file-upload-premium__label">{{ chooseLabel() }}</p>
            <p class="file-upload-premium__hint">{{ hintDisplay() }}</p>
          </div>
          <ng-content select="[empty]" />
        </div>
      } @else {
        <div class="file-upload-premium__files">
          @for (file of files(); track file.name + file.size; let i = $index) {
            <div #fileItem class="file-upload-premium__file">
              <span class="file-upload-premium__file-name">{{ file.name }}</span>
              <span class="file-upload-premium__file-size">{{ formatSize(file.size) }}</span>
              <button
                type="button"
                class="file-upload-premium__file-remove"
                (click)="removeFile(i)"
                aria-label="Eliminar"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
          }
          @if (canAddMore()) {
            <button
              type="button"
              class="file-upload-premium__add-more"
              (click)="onEmptyClick()"
            >
              <i class="pi pi-plus"></i>
              {{ chooseLabel() }}
            </button>
          }
        </div>
      }
      <input
        #fileInput
        type="file"
        [multiple]="multiple()"
        [accept]="accept()"
        [disabled]="disabled()"
        (change)="onFileChange($event)"
        class="file-upload-premium__input"
      />
    </div>
  `,
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent implements AfterViewInit {
  private gsap = inject(GsapAnimationsService);
  private host = inject(ElementRef<HTMLElement>);
  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  emptyZone = viewChild<ElementRef<HTMLElement>>('emptyZone');

  chooseLabel = input<string>('Elegir archivos');
  chooseIcon = input<string>('pi-upload');
  multiple = input<boolean>(true);
  accept = input<string | undefined>(undefined);
  maxFileSize = input<number | undefined>(undefined);
  maxFiles = input<number | undefined>(undefined);
  disabled = input<boolean>(false);
  hint = input<string | undefined>(undefined);

  files = signal<File[]>([]);
  isDragOver = signal(false);
  filesChange = output<File[]>();

  /** Hint calculado: custom o generado desde maxFileSize/maxFiles */
  hintDisplay = computed(() => {
    const custom = this.hint();
    if (custom) return custom;
    const parts: string[] = [];
    const maxSize = this.maxFileSize();
    const maxFiles = this.maxFiles();
    if (maxSize) parts.push(`Máx. ${this.formatSize(maxSize)} por archivo`);
    if (maxFiles) parts.push(`Máx. ${maxFiles} archivos`);
    return parts.length > 0 ? parts.join(' · ') : 'Arrastra archivos o haz clic para seleccionar';
  });

  canAddMore(): boolean {
    const max = this.maxFiles();
    return !max || this.files().length < max;
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (!this.disabled()) this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    if (this.disabled()) return;
    const items = e.dataTransfer?.files;
    if (items?.length) this.addFiles(Array.from(items));
  }

  onEmptyClick(): void {
    if (this.disabled()) return;
    this.fileInput()?.nativeElement?.click();
  }

  onEmptyKeydown(e: Event): void {
    const ev = e as KeyboardEvent;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.onEmptyClick();
    }
  }

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length) this.addFiles(files);
    input.value = '';
  }

  private addFiles(newFiles: File[]): void {
    let list = [...this.files()];
    const maxFiles = this.maxFiles();
    const maxSize = this.maxFileSize();
    const acc = this.accept();

    for (const f of newFiles) {
      if (maxFiles && list.length >= maxFiles) break;
      if (maxSize && f.size > maxSize) continue;
      if (acc && !this.isAcceptValid(f, acc)) continue;
      list.push(f);
    }
    this.files.set(list);
    this.filesChange.emit(list);
  }

  private isAcceptValid(file: File, accept: string): boolean {
    const parts = accept.split(',').map((s) => s.trim());
    for (const p of parts) {
      if (p.startsWith('.')) {
        if (file.name.toLowerCase().endsWith(p.toLowerCase())) return true;
      } else if (p.endsWith('/*')) {
        const base = p.slice(0, -2);
        if (file.type.startsWith(base)) return true;
      } else if (file.type === p) return true;
    }
    return false;
  }

  removeFile(index: number): void {
    const list = this.files().filter((_, i) => i !== index);
    this.files.set(list);
    this.filesChange.emit(list);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  constructor() {
    effect(() => {
      const f = this.files();
      if (f.length > 0) {
        setTimeout(() => this.animateFileItemsIn(), 50);
      }
    });
  }

  ngAfterViewInit(): void {
    const empty = this.emptyZone()?.nativeElement;
    if (empty) this.gsap.fadeIn(empty, 0.05);
  }

  private animateFileItemsIn(): void {
    const host = this.host.nativeElement;
    const items = host.querySelectorAll('.file-upload-premium__file');
    if (items.length) this.gsap.staggerListItems(Array.from(items));
  }
}
