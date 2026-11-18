import { Stream } from '@prisma/client';
import { prisma } from './db';

export interface BudgetTile {
  year: number;
  stream: Stream;
  budget: number;
  committed: number;
  paid: number;
  available: number;
}

export function computeBudgetTile(input: {
  year: number;
  stream: Stream;
  totalBudget: { toString(): string } | number;
  committedAmount: { toString(): string } | number;
  paidAmount: { toString(): string } | number;
}): BudgetTile {
  const budget = Number(input.totalBudget.toString());
  const committed = Number(input.committedAmount.toString());
  const paid = Number(input.paidAmount.toString());
  return {
    year: input.year,
    stream: input.stream,
    budget,
    committed,
    paid,
    available: Math.max(0, budget - committed),
  };
}

export async function getBudgetTiles(year = new Date().getFullYear()): Promise<BudgetTile[]> {
  const budgets = await prisma.budget.findMany({ where: { year } });
  return budgets.map(computeBudgetTile);
}

/** Called after trustee approval / payment posting so tiles stay in sync. */
export async function recomputeBudget(year: number, stream: Stream): Promise<void> {
  const aggregate = await prisma.trusteeDecision.aggregate({
    where: {
      decision: 'APPROVE',
      application: { stream, createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    },
    _sum: { approvedAmount: true },
  });
  const payments = await prisma.payment.aggregate({
    where: {
      paidAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) },
      invoice: { child: { applications: { some: { stream } } } },
    },
    _sum: { amount: true },
  });
  await prisma.budget.upsert({
    where: { year_stream: { year, stream } },
    update: {
      committedAmount: aggregate._sum.approvedAmount ?? 0,
      paidAmount: payments._sum.amount ?? 0,
    },
    create: {
      year,
      stream,
      totalBudget: 0,
      committedAmount: aggregate._sum.approvedAmount ?? 0,
      paidAmount: payments._sum.amount ?? 0,
    },
  });
}
