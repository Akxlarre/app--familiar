import { Injectable, inject } from '@angular/core';
import { TransactionService } from './transaction.service';
import { BudgetService } from './budget.service';
import { AccountService } from './account.service';
import type { FinanceSummary } from '@core/models/finance.model';

@Injectable({
  providedIn: 'root',
})
export class FinanceSummaryService {
  private transactionService = inject(TransactionService);
  private budgetService = inject(BudgetService);
  private accountService = inject(AccountService);

  async getSummary(
    householdId: string,
    year: number,
    month: number
  ): Promise<{ data: FinanceSummary; error: Error | null }> {
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0);
    const toDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    const [txRes, budgetRes, spentByCatRes] = await Promise.all([
      this.transactionService.getTransactions({
        householdId,
        fromDate: firstDay,
        toDate,
      }),
      this.budgetService.getBudgets(householdId, year, month),
      this.transactionService.getExpensesByCategoryForMonth(householdId, year, month),
    ]);

    if (txRes.error) {
      return {
        data: this.emptySummary(),
        error: txRes.error,
      };
    }

    const transactions = txRes.data;
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    const budgets = budgetRes.data ?? [];
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
    const spentByCategory = new Map(
      (spentByCatRes.data ?? []).map(s => [s.category_id, s.total])
    );
    const totalSpent = Array.from(spentByCategory.values()).reduce((a, b) => a + b, 0);
    const budgetUsedPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const topCategories = (spentByCatRes.data ?? [])
      .map(s => {
        const cat = transactions.find(t => t.category_id === s.category_id)?.category;
        return {
          categoryId: s.category_id,
          categoryName: cat?.name ?? 'Sin categoría',
          value: s.total,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      data: {
        totalIncome,
        totalExpenses,
        balance,
        savingsRate,
        budgetUsedPercent,
        totalBudget,
        totalSpent,
        topCategories,
      },
      error: null,
    };
  }

  async getSummaryWithComparison(
    householdId: string,
    year: number,
    month: number
  ): Promise<{ data: FinanceSummary; error: Error | null }> {
    const res = await this.getSummary(householdId, year, month);
    if (res.error) return res;

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevRes = await this.getSummary(householdId, prevYear, prevMonth);
    if (prevRes.error) return res;

    const incomeVsLastMonth =
      prevRes.data.totalIncome > 0
        ? ((res.data.totalIncome - prevRes.data.totalIncome) / prevRes.data.totalIncome) * 100
        : 0;
    const expensesVsLastMonth =
      prevRes.data.totalExpenses > 0
        ? ((res.data.totalExpenses - prevRes.data.totalExpenses) / prevRes.data.totalExpenses) * 100
        : 0;

    return {
      data: {
        ...res.data,
        incomeVsLastMonth,
        expensesVsLastMonth,
      },
      error: null,
    };
  }

  private emptySummary(): FinanceSummary {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      savingsRate: 0,
      budgetUsedPercent: 0,
      totalBudget: 0,
      totalSpent: 0,
      topCategories: [],
    };
  }
}
