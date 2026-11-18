import type { PaymentMethod } from '@prisma/client';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, type AuthUser } from '@/lib/auth/session';
import { recomputeBudget } from '@/lib/budget';
import { prisma } from '@/lib/db';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { performTransition } from './workflow-service';

export async function listInvoices() {
  return prisma.feeInvoice.findMany({
    include: { child: true, payments: true },
    orderBy: { issuedAt: 'desc' },
  });
}

export async function createInvoice(
  user: AuthUser,
  input: { childId: string; invoiceNo: string; amount: number; dueDate: Date },
) {
  assertCan(user.role, PERMISSIONS.FINANCE_MANAGE);
  const invoice = await prisma.feeInvoice.create({ data: input });
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'CREATE',
    entityType: 'FeeInvoice',
    entityId: invoice.id,
    ...(await getRequestMeta()),
  });
  return invoice;
}

export async function activateAward(
  user: AuthUser,
  id: string,
  input: { instalments: Array<{ sequence: number; amount: number; dueDate: Date; invoiceId?: string }> },
) {
  assertCan(user.role, PERMISSIONS.FINANCE_MANAGE);
  if (input.instalments.length === 0) throw new BadRequestError('At least one instalment is required');

  const result = await performTransition({
    user,
    applicationId: id,
    to: 'ACTIVE_AWARD',
    payload: { instalmentsCreated: true },
    sideEffects: async (tx, application, now) => {
      const decision = await tx.trusteeDecision.findUnique({ where: { applicationId: id } });
      const total = input.instalments.reduce((sum, item) => sum + item.amount, 0);
      const approved = Number(decision?.approvedAmount ?? 0);
      if (approved > 0 && Math.abs(total - approved) > 1) {
        throw new BadRequestError('Instalment total must match the approved award amount');
      }
      await tx.paymentInstalment.createMany({
        data: input.instalments.map((item) => ({
          awardId: id,
          sequence: item.sequence,
          amount: item.amount,
          dueDate: item.dueDate,
          invoiceId: item.invoiceId ?? null,
          status: item.dueDate.getTime() <= now.getTime() ? 'DUE' : 'PENDING',
        })),
      });
      await tx.award.update({ where: { applicationId: id }, data: { status: 'ACTIVE' } });
    },
  });
  return result;
}

export async function recordPayment(
  user: AuthUser,
  input: {
    instalmentId: string;
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    reference: string;
    paidAt?: Date;
  },
) {
  assertCan(user.role, PERMISSIONS.FINANCE_MANAGE);
  const payment = await prisma.$transaction(async (tx) => {
    const instalment = await tx.paymentInstalment.findUnique({
      where: { id: input.instalmentId },
      include: { award: { include: { application: true } } },
    });
    if (!instalment) throw new NotFoundError('Instalment not found');
    const prior = await tx.payment.aggregate({ where: { instalmentId: instalment.id }, _sum: { amount: true } });
    const totalPaid = Number(prior._sum.amount ?? 0) + input.amount;
    if (totalPaid > Number(instalment.amount) + 0.01) {
      throw new BadRequestError('Payment exceeds the outstanding instalment amount');
    }
    const created = await tx.payment.create({
      data: {
        instalmentId: instalment.id,
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        paidAt: input.paidAt ?? new Date(),
        recordedById: user.id,
      },
    });
    const settled = totalPaid >= Number(instalment.amount) - 0.01;
    await tx.paymentInstalment.update({
      where: { id: instalment.id },
      data: { status: settled ? 'PAID' : 'DUE', paidAt: settled ? new Date() : null },
    });
    const invoiceTotal = await tx.payment.aggregate({ where: { invoiceId: input.invoiceId }, _sum: { amount: true } });
    const invoice = await tx.feeInvoice.findUnique({ where: { id: input.invoiceId } });
    if (!invoice) throw new NotFoundError('Invoice not found');
    const invoicePaid = Number(invoiceTotal._sum.amount ?? 0) >= Number(invoice.amount) - 0.01;
    await tx.feeInvoice.update({
      where: { id: input.invoiceId },
      data: { status: invoicePaid ? 'PAID' : 'PARTIALLY_PAID' },
    });
    return { created, application: instalment.award.application };
  });

  await recomputeBudget(new Date().getFullYear(), payment.application.stream);
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'PAYMENT_RECORDED',
    entityType: 'Payment',
    entityId: payment.created.id,
    metadata: { amount: input.amount, instalmentId: input.instalmentId, reference: input.reference },
    ...(await getRequestMeta()),
  });
  return payment.created;
}

export async function getLedger() {
  return prisma.paymentInstalment.findMany({
    include: {
      award: {
        include: {
          application: { include: { child: true, guardian: { select: { fullName: true } } } },
        },
      },
      invoice: true,
      payments: { orderBy: { paidAt: 'desc' } },
    },
    orderBy: { dueDate: 'asc' },
  });
}

export async function generateInstalmentsFromAward(id: string) {
  const award = await prisma.award.findUnique({ where: { applicationId: id } });
  if (!award) throw new ConflictError('Award not found');
  const amount = Number(award.amount) / 3;
  return [1, 2, 3].map((sequence) => ({
    sequence,
    amount: Math.round(amount * 100) / 100,
    dueDate: new Date(Date.now() + sequence * 30 * 86_400_000),
  }));
}
