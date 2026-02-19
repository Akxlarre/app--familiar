# Sidebar — Arquitectura

## Menú lateral

El menú muestra items genéricos de navegación configurados en MenuConfigService.

### Categorías y páginas

| Categoría | Páginas |
|-----------|---------|
| Inicio | Página 1 |
| Operación | Página 2, Página 3 |
| Alumnos | Página 4, Página 5 |
| Administración | Página 6, Página 7 |

### Servicio: MenuConfigService

- **Ubicación:** `src/app/core/services/menu-config.service.ts`
- **Responsabilidad:** Generar `MenuItem[]` para el menú.

```typescript
// Uso en SidebarComponent
menuItems = this.menuConfigService.menuItems; // computed signal
```

---

## Contenido según escuela activa

Las rutas (`/students`, `/schedule`, etc.) son las mismas para todos. Lo que cambia es el **contexto de datos** según la escuela seleccionada.

### Flujo

```
SchoolService.currentSchool() → school.id
         ↓
Cualquier feature que cargue datos
         ↓
API: GET /students?schoolId=a
     GET /classes?schoolId=a
```

### Implementación en features

```typescript
// Ejemplo: students.component.ts
export class StudentsComponent {
  private schoolService = inject(SchoolService);
  private studentsService = inject(StudentsService);

  students = computed(() => {
    const school = this.schoolService.currentSchool();
    if (!school) return [];
    return this.studentsService.getBySchool(school.id);
  });
}
```

### Alternativas

1. **Interceptor HTTP:** Añadir `X-School-Id` o `?schoolId=` a todas las peticiones.
2. **SchoolDataService:** Facade que combina SchoolService + llamadas API con filtro por escuela.

---

## Diagrama de dependencias

```
SidebarComponent
  └── MenuConfigService

Features (Pagina1, Pagina2, Pagina3, etc.)
  └── SchoolService (currentSchool) — cuando se implementen
  └── API con schoolId
```

---

## Pendiente de implementación

- [ ] Menú por rol (Administrador, Secretaria, Instructor) cuando se requiera
- [ ] Features que consuman `SchoolService.currentSchool()` para filtrar datos
- [ ] Interceptor HTTP para inyectar `schoolId` en peticiones
