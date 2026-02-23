import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import type { Transaction } from '@core/models/finance.model';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportTransactionRow {
  Fecha: string;
  Tipo: string;
  Categoría: string;
  Cuenta: string;
  Monto: number;
  Nota: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  /**
   * Convierte transacciones a filas para exportación.
   */
  private toRows(transactions: Transaction[]): ExportTransactionRow[] {
    return transactions.map((tx) => ({
      Fecha: tx.date,
      Tipo: tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Gasto' : 'Transferencia',
      Categoría: tx.category?.name ?? '—',
      Cuenta: tx.account?.name ?? '—',
      Monto: tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0,
      Nota: tx.note ?? '',
    }));
  }

  /**
   * Exporta transacciones a CSV.
   */
  exportToCsv(transactions: Transaction[], filename = 'transacciones'): void {
    const rows = this.toRows(transactions);
    const headers = Object.keys(rows[0] ?? {}) as (keyof ExportTransactionRow)[];
    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => headers.map((h) => this.escapeCsv(String(r[h]))).join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);
  }

  private escapeCsv(value: string): string {
    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Exporta transacciones a Excel (.xlsx).
   */
  exportToExcel(transactions: Transaction[], filename = 'transacciones'): void {
    const rows = this.toRows(transactions);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  /**
   * Exporta transacciones a PDF (genera HTML imprimible).
   */
  exportToPdf(transactions: Transaction[], filename = 'transacciones'): void {
    const rows = this.toRows(transactions);
    const totalIngresos = rows.filter((r) => r.Monto > 0).reduce((s, r) => s + r.Monto, 0);
    const totalGastos = rows.filter((r) => r.Monto < 0).reduce((s, r) => s + Math.abs(r.Monto), 0);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Transacciones</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #333; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    .amount-positive { color: #22c55e; }
    .amount-negative { color: #ef4444; }
    .totals { margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
    .totals p { margin: 4px 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Reporte de Transacciones</h1>
  <p class="meta">Generado el ${new Date().toLocaleDateString('es-CL', { dateStyle: 'long' })} · ${rows.length} transacciones</p>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Tipo</th>
        <th>Categoría</th>
        <th>Cuenta</th>
        <th>Monto</th>
        <th>Nota</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          <td>${r.Fecha}</td>
          <td>${r.Tipo}</td>
          <td>${r.Categoría}</td>
          <td>${r.Cuenta}</td>
          <td class="${r.Monto >= 0 ? 'amount-positive' : 'amount-negative'}">${r.Monto >= 0 ? '+' : ''}${r.Monto.toLocaleString('es-CL')} $</td>
          <td>${r.Nota}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <div class="totals">
    <p><strong>Total ingresos:</strong> ${totalIngresos.toLocaleString('es-CL')} $</p>
    <p><strong>Total gastos:</strong> ${totalGastos.toLocaleString('es-CL')} $</p>
    <p><strong>Balance:</strong> ${(totalIngresos - totalGastos).toLocaleString('es-CL')} $</p>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener');
    if (win) {
      win.onload = () => URL.revokeObjectURL(url);
    } else {
      this.downloadBlob(blob, `${filename}.html`);
      URL.revokeObjectURL(url);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
