import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import type { Budget } from '@core/models/finance.model';
import { BudgetService } from './budget.service';
import { TransactionService } from './transaction.service';
import { RecurringService } from './recurring.service';

@Injectable({
  providedIn: 'root',
})
export class FinanceNotificationsService {
  private messageService = inject(MessageService);
  private budgetService = inject(BudgetService);
  private transactionService = inject(TransactionService);
  private recurringService = inject(RecurringService);

  /**
   * Verifica alertas de presupuesto y recurrentes, y muestra Toasts si corresponde.
   */
  async checkAndNotify(householdId: string): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [budgetRes, recurringRes] = await Promise.all([
      this.budgetService.getBudgets(householdId, year, month),
      this.recurringService.getUpcoming(householdId, 7),
    ]);

    const budgets = budgetRes.data ?? [];
    const spentRes = await this.transactionService.getExpensesByCategoryForMonth(householdId, year, month);
    const spentByCat = new Map((spentRes.data ?? []).map((s) => [s.category_id, s.total]));

    const budgetAlerts: { msg: { severity: string; summary: string; detail: string; life?: number }; pct: number }[] = [];
    for (const b of budgets as Budget[]) {
      const spent = spentByCat.get(b.category_id) ?? 0;
      const pct = Number(b.amount) > 0 ? (spent / Number(b.amount)) * 100 : 0;
      const threshold = b.alert_threshold ?? 80;

      const catName = b.category?.name ?? 'Categoría';
      if (pct >= 100) {
        budgetAlerts.push({
          pct,
          msg: {
            severity: 'error',
            summary: 'Presupuesto superado',
            detail: `${catName}: has gastado ${spent.toLocaleString('es-CL')} $ de ${Number(b.amount).toLocaleString('es-CL')} $ (${pct.toFixed(0)}%)`,
            life: 8000,
          },
        });
      } else if (pct >= threshold) {
        budgetAlerts.push({
          pct,
          msg: {
            severity: 'warn',
            summary: 'Presupuesto cerca del límite',
            detail: `${catName}: ${pct.toFixed(0)}% usado (umbral ${threshold}%)`,
            life: 6000,
          },
        });
      }
    }
    budgetAlerts.sort((a, b) => b.pct - a.pct).slice(0, 2).forEach((a) => this.messageService.add(a.msg));

    const recurring = recurringRes.data ?? [];
    const today = now.toISOString().slice(0, 10);
    for (const r of recurring.slice(0, 2)) {
      const due = r.next_due_date;
      const isToday = due === today;
      this.messageService.add({
        severity: isToday ? 'warn' : 'info',
        summary: isToday ? 'Recurrente hoy' : 'Próximo recurrente',
        detail: `${r.description || r.category?.name || 'Recurrente'}: ${r.amount.toLocaleString('es-CL')} $ · ${due}`,
        life: 5000,
      });
    }
  }
}
