# Bento Layout Rule

## Contenedor
Aplicar `[appBentoGridLayout]` en el elemento con clase `bento-grid`.

```html
<section appBentoGridLayout class="bento-grid">
  <!-- celdas -->
</section>
```

## Hijos que cambian tamaño
Inyectar `BENTO_GRID_LAYOUT_CONTEXT` y llamar `runLayoutChange(callback)` al aplicar el cambio (ej. paginación).

```typescript
private layoutContext = inject(BENTO_GRID_LAYOUT_CONTEXT, { optional: true });

onPageChange(): void {
  this.layoutContext?.runLayoutChange(() => {
    this.rows.set(newRows);
  });
}
```

## Ver
`src/app/core/directives/bento-grid-layout.README.md`
