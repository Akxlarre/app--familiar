# Interactive Feedback Rule

## Botones y triggers
Usar `[appPressFeedback]` en botones del topbar, triggers, pills del sidebar.

```html
<button appPressFeedback (click)="toggle()">Abrir</button>
```

## Cards en bento-grid
Usar `GsapAnimationsService.addCardHover(el)` en `ngAfterViewInit` para cada card.

```typescript
ngAfterViewInit(): void {
  const cards = this.host.nativeElement.querySelectorAll('.card');
  cards.forEach(el => this.gsap.addCardHover(el as HTMLElement));
}
```

## NO crear
Feedback custom con CSS `transition` si ya existe en el servicio o en directivas.
