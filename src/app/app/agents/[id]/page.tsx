import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { CommissionType, Role } from '@prisma/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { upsertAgentCommissionAction } from '../actions';
import { formatINR } from '@/lib/money';

export default async function AgentCommissionPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (user.role !== Role.SUPER_ADMIN && user.role !== Role.CONSULTANT) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const agent = await prisma.user.findUnique({
    where: { id: params.id },
    include: { parent: true }
  });

  if (!agent || agent.role !== Role.AGENT) return notFound();

  if (user.role === Role.CONSULTANT && agent.parentId !== user.id) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const [courses, commissions] = await Promise.all([
    prisma.course.findMany({
      include: { university: true },
      orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }]
    }),
    prisma.agentCommission.findMany({ where: { agentId: agent.id } })
  ]);

  const commissionByCourse = new Map(commissions.map((c) => [c.courseId, c]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Agent Commission</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Agent: <span className="font-medium text-zinc-900">{agent.name}</span> ({agent.userId})
          </p>
          {agent.parent ? (
            <p className="text-sm text-zinc-600">
              Parent consultant: {agent.parent.name} ({agent.parent.userId})
            </p>
          ) : null}
        </div>
        <Link href="/app/agents" className="text-sm underline">Back</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission per Course</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Course</TH>
                  <TH>University</TH>
                  <TH>University Fee</TH>
                  <TH>Type</TH>
                  <TH>Value</TH>
                  <TH className="text-right">Save</TH>
                </TR>
              </THead>
              <TBody>
                {courses.map((course) => {
                  const existing = commissionByCourse.get(course.id);
                  const defaultType = existing?.type ?? CommissionType.PERCENT;
                  const defaultValue = existing?.value ?? 0;
                  const formId = `commission-${course.id}`;

                  return (
                    <TR key={course.id}>
                      <TD>
                        <div className="font-medium">{course.name}</div>
                        <div className="text-xs text-zinc-500">Display fee: {formatINR(course.displayFee)}</div>
                      </TD>
                      <TD>{course.university.name}</TD>
                      <TD>{formatINR(course.universityFee)}</TD>
                      <TD>
                        <Select name="type" form={formId} defaultValue={defaultType}>
                          <option value={CommissionType.PERCENT}>Percent of profit</option>
                          <option value={CommissionType.FLAT}>Flat amount</option>
                          <option value={CommissionType.ONE_TIME}>One-time amount</option>
                        </Select>
                      </TD>
                      <TD>
                        <Input
                          name="value"
                          form={formId}
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={defaultValue}
                          className="w-28"
                        />
                      </TD>
                      <TD className="text-right">
                        <form id={formId} action={upsertAgentCommissionAction} className="flex justify-end">
                          <input type="hidden" name="agentId" value={agent.id} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <Button type="submit" size="sm">Save</Button>
                        </form>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <div className="font-medium text-zinc-900">How it’s used</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li><b>Consultancy profit</b> = Amount received from student − University fee</li>
              <li><b>Agent commission</b> = Percent/Flat/One-time as configured above (from consultancy profit)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
