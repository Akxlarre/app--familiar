import { Injectable, signal } from '@angular/core';

/**
 * Servicio para controlar el panel de búsqueda desde cualquier parte.
 * Usado por el atajo global Ctrl+K / Cmd+K.
 */
@Injectable({
  providedIn: 'root',
})
export class SearchPanelService {
  /** Emite cuando se debe abrir el panel (ej. atajo Ctrl+K) */
  private _openRequested = signal(0);

  /** Incrementa para notificar apertura; el panel escucha y reacciona */
  readonly openRequested = this._openRequested.asReadonly();

  open(): void {
    this._openRequested.update((v) => v + 1);
  }

  /** Para que el panel pueda "consumir" el evento si lo necesita */
  consumeOpenRequest(): number {
    return this._openRequested();
  }
}
