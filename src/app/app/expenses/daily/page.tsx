import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ExpenseType, Role } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatINR } from '@/lib/money';
import { addDailyExpenseAction, deleteDailyExpenseAction } from '../actions';

function expenseScopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return { type: ExpenseType.DAILY };

  const consultantId = user.role === Role.CONSULTANT ? user.id : user.role === Role.STAFF ? (user.parentId ?? '__NONE__') : '__NONE__';

  return {
    type: ExpenseType.DAILY,
    OR: [
      { createdById: consultantId },
      { createdBy: { parentId: consultantId } }
    ]
  };
}

export default async function DailyExpensesPage() {
  const user = await requireUser();

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'EXPENSE_ADD'));

  if (!allowed) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const [expenses, monthlyAgg] = await Promise.all([
    prisma.expense.findMany({
      where: expenseScopeWhere(user),
      include: { createdBy: true },
      orderBy: { date: 'desc' }
    }),
    prisma.expense.aggregate({
      where: { ...expenseScopeWhere(user), date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true }
    })
  ]);

  const monthlyTotal = monthlyAgg._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily Expense Register</h1>
        <p className="mt-1 text-sm text-zinc-600">Add daily office expenses and track monthly totals.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>This month total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(monthlyTotal)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addDailyExpenseAction} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g. Rent" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" min={0} step={1} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="Rent / Salary / Travel" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="proofUrl">Proof URL (optional)</Label>
              <Input id="proofUrl" name="proofUrl" placeholder="https://…" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Add expense</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Title</TH>
                  <TH>Category</TH>
                  <TH>Created by</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {expenses.map((e) => (
                  <TR key={e.id}>
                    <TD>{new Date(e.date).toLocaleDateString()}</TD>
                    <TD>
                      <div className="font-medium">{e.title}</div>
                      {e.proofUrl ? <div className="text-xs text-zinc-500">{e.proofUrl}</div> : null}
                    </TD>
                    <TD>{e.category ?? '—'}</TD>
                    <TD>{e.createdBy?.name ?? '—'}</TD>
                    <TD className="text-right">{formatINR(e.amount)}</TD>
                    <TD className="text-right">
                      <form action={deleteDailyExpenseAction.bind(null, e.id)}>
                        <button className="text-sm text-red-700 underline" type="submit">Delete</button>
                      </form>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {expenses.length === 0 ? <div className="text-sm text-zinc-600">No daily expenses yet.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
