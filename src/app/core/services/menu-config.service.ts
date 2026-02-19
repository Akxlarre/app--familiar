import { Injectable, computed } from '@angular/core';
import { MenuItem } from 'primeng/api';

/**
 * MenuConfigService - Configuración del menú lateral
 *
 * Items genéricos para navegación. Los datos mostrados en cada ruta
 * dependen de SchoolService.currentSchool cuando se implementen features.
 *
 * @see src/app/core/layout/sidebar/ARCHITECTURE.md
 */
@Injectable({
  providedIn: 'root',
})
export class MenuConfigService {
  readonly menuItems = computed<MenuItem[]>(() => [
    {
      label: 'Inicio',
      items: [
        { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/app/dashboard' },
        { label: 'Página 1', icon: 'pi pi-file', routerLink: '/app/pagina-1' },
      ],
    },
    {
      label: 'Operación',
      items: [
        { label: 'Página 2', icon: 'pi pi-file', routerLink: '/app/pagina-2' },
        { label: 'Página 3', icon: 'pi pi-file', routerLink: '/app/pagina-3' },
      ],
    },
    {
      label: 'Alumnos',
      items: [
        { label: 'Página 4', icon: 'pi pi-file', routerLink: '/app/pagina-4' },
        { label: 'Página 5', icon: 'pi pi-file', routerLink: '/app/pagina-5' },
      ],
    },
    {
      label: 'Administración',
      items: [
        { label: 'Página 6', icon: 'pi pi-file', routerLink: '/app/pagina-6' },
        { label: 'Página 7', icon: 'pi pi-file', routerLink: '/app/pagina-7' },
      ],
    },
  ]);
}
