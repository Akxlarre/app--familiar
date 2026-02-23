/** Propósitos de cuentas para presupuesto por propósito (sincronizado con saldos). */
export const PURPOSE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Sin definir', value: '' },
  { label: 'Personal', value: 'personal' },
  { label: 'Alimentación', value: 'alimentacion' },
  { label: 'Deudas', value: 'deudas' },
  { label: 'Recurrentes', value: 'recurrentes' },
  { label: 'Emergencias', value: 'emergencias' },
  { label: 'Suscripciones', value: 'suscripciones' },
  { label: 'Hogar', value: 'hogar' },
  { label: 'Otros', value: 'otros' },
];

export function getPurposeLabel(value: string | null | undefined): string {
  if (value == null || !value.trim()) return 'Sin definir';
  return PURPOSE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
