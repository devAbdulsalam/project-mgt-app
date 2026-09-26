import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Check, Plus, Receipt, Undo2, X } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, EmptyState, Field, Menu, Pill, PillTabs, Select, StatTile, Textarea } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { toast } from '@/shared/lib/toast-store';
import type { Expense, ExpenseStatus } from '@/mocks/types';
import { useProgramList } from '@/features/programs/api';
import { categoryLabels, expenseStatusLabels, expenseTone, formatMoney } from '@/features/programs/model';
import { useCanApprove, useExpenseActions, useExpenseList } from './api';
import { NewExpenseDialog } from './NewExpenseDialog';
import type { ExpensesSearch } from './model';

/**
 * Rejecting asks for a reason before it will send.
 *
 * The server refuses a rejection without one, so collecting it here is not
 * belt-and-braces — it is the difference between an error and a form.
 */
function RejectPrompt({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (reason: string) => void }) {
	const [reason, setReason] = useState('');

	return (
		<div className="mt-2 rounded-[10px] border border-border bg-muted/40 p-3">
			<Field label="Why is it rejected?">
				{(id) => (
					<Textarea
						id={id}
						rows={2}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Covered by the client retainer — bill it there instead."
						autoFocus
					/>
				)}
			</Field>
			<div className="mt-2 flex gap-2">
				<Button size="sm" variant="primary" disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>
					Reject
				</Button>
				<Button size="sm" onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</div>
	);
}

function ExpenseRow({ expense, orgSlug, canApprove }: { expense: Expense; orgSlug: string; canApprove: boolean }) {
	const actions = useExpenseActions(orgSlug);
	const [rejecting, setRejecting] = useState(false);

	const move = (status: ExpenseStatus, reason?: string) =>
		void actions.setStatus(expense.id, status, reason).then((ok) => {
			if (ok) toast(`${formatMoney(expense.amount, expense.currency)} ${expenseStatusLabels[status].toLowerCase()}`, { tone: 'success' });
		});

	return (
		<li className="border-b border-border px-5 py-3.5 last:border-0">
			<div className="flex flex-wrap items-start gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-semibold">{expense.description || categoryLabels[expense.category]}</span>
						<Pill tone={expenseTone[expense.status]}>{expenseStatusLabels[expense.status]}</Pill>
						<Pill tone="closed">{categoryLabels[expense.category] ?? expense.category}</Pill>
						{expense.receiptCount > 0 ? (
							<span className="inline-flex items-center gap-1 text-xs text-t3">
								<Receipt size={12} aria-hidden /> {expense.receiptCount}
							</span>
						) : null}
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-t3">
						<span>{expense.incurredOn}</span>
						{expense.activityKey ? (
							<span>
								· {expense.activityKey} {expense.activityTitle ? `— ${expense.activityTitle}` : ''}
							</span>
						) : expense.programKey ? (
							<span>· {expense.programName ?? expense.programKey}</span>
						) : null}
						{expense.submittedByName ? <span>· by {expense.submittedByName}</span> : null}
					</div>
					{expense.rejectionReason ? (
						<p className="mt-1.5 text-xs text-danger">Rejected: {expense.rejectionReason}</p>
					) : null}
				</div>

				<div className="text-end">
					<div className="tabular font-semibold">{formatMoney(expense.amount, expense.currency)}</div>
					{!expense.countsAsSpent && expense.status !== 'rejected' ? (
						<div className="text-xs text-t3">not counted yet</div>
					) : null}
				</div>

				<div className="flex items-center gap-1.5">
					{expense.status === 'draft' ? (
						<Button size="sm" onClick={() => move('submitted')}>
							Submit
						</Button>
					) : null}

					{expense.status === 'submitted' && canApprove ? (
						<>
							<Button size="sm" variant="primary" onClick={() => move('approved')}>
								<Check size={14} aria-hidden /> Approve
							</Button>
							<Button size="sm" onClick={() => setRejecting((v) => !v)}>
								<X size={14} aria-hidden /> Reject
							</Button>
						</>
					) : null}

					{expense.status === 'approved' && canApprove ? (
						<Menu
							width="w-44"
							trigger={({ toggle, buttonProps }) => (
								<Button size="sm" onClick={toggle} {...buttonProps}>
									More
								</Button>
							)}
							items={[
								{ key: 'paid', label: 'Mark as paid', onSelect: () => move('paid') },
								{
									key: 'reopen',
									label: 'Send back for review',
									icon: <Undo2 size={14} />,
									onSelect: () => move('submitted'),
								},
							]}
						/>
					) : null}

					{expense.status === 'rejected' ? (
						<Button size="sm" onClick={() => move('draft')}>
							Reopen
						</Button>
					) : null}
				</div>
			</div>

			{rejecting ? (
				<RejectPrompt
					onCancel={() => setRejecting(false)}
					onConfirm={(reason) => {
						setRejecting(false);
						move('rejected', reason);
					}}
				/>
			) : null}
		</li>
	);
}

export function ExpensesPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/expenses' });
	const [creating, setCreating] = useState(false);

	const canApprove = useCanApprove();
	const { programs } = useProgramList(org.slug, true);
	const { expenses, totals, loading } = useExpenseList(org.slug, {
		program: search.program,
		status: search.status,
		mine: search.mine,
	});

	const setSearch = (patch: Partial<ExpensesSearch>) =>
		navigate({ to: '/$org/expenses', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const currency = programs.find((p) => p.key === search.program)?.currency ?? 'NGN';

	return (
		<AppShell
			meta={{
				title: 'Expenses',
				subtitle: totals?.awaitingCount
					? `${totals.awaitingCount} waiting on a decision`
					: 'What the programmes cost',
			}}
			mobileHeader={<MobileHeader>Expenses</MobileHeader>}
		>
			<div className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<StatTile label="Approved" value={formatMoney(totals?.approved ?? 0, currency)} sub="counts as spent" />
					<StatTile label="Paid" value={formatMoney(totals?.paid ?? 0, currency)} />
					<StatTile
						label="Awaiting approval"
						value={formatMoney(totals?.submitted ?? 0, currency)}
						sub={totals?.awaitingCount ? `${totals.awaitingCount} claim${totals.awaitingCount === 1 ? '' : 's'}` : 'nothing pending'}
						subTone={totals?.awaitingCount ? 'bad' : 'muted'}
					/>
					<StatTile label="Drafts" value={formatMoney(totals?.draft ?? 0, currency)} sub="not submitted" />
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<PillTabs
						value={search.status ?? 'all'}
						onChange={(key) => setSearch({ status: key === 'all' ? undefined : (key as ExpenseStatus) })}
						ariaLabel="Filter by status"
						items={[
							{ key: 'all', label: 'All' },
							{ key: 'submitted', label: 'Awaiting' },
							{ key: 'approved', label: 'Approved' },
							{ key: 'paid', label: 'Paid' },
							{ key: 'draft', label: 'Drafts' },
							{ key: 'rejected', label: 'Rejected' },
						]}
					/>

					<Select
						value={search.program ?? ''}
						onChange={(e) => setSearch({ program: e.target.value || undefined })}
						aria-label="Filter by programme"
						className="w-full sm:w-56"
					>
						<option value="">Every programme</option>
						{programs.map((p) => (
							<option key={p.id} value={p.key}>
								{p.name}
							</option>
						))}
					</Select>

					<label className="flex items-center gap-2 text-[13px] text-t2">
						<input
							type="checkbox"
							checked={Boolean(search.mine)}
							onChange={(e) => setSearch({ mine: e.target.checked || undefined })}
						/>
						Only mine
					</label>

					<Button variant="primary" className="ms-auto" onClick={() => setCreating(true)}>
						<Plus size={15} aria-hidden /> Log an expense
					</Button>
				</div>

				{loading ? (
					<div className="card p-10 text-center text-[13px] text-t2">Loading expenses…</div>
				) : expenses.length === 0 ? (
					<div className="card">
						<EmptyState
							icon={<Receipt size={20} />}
							title="Nothing here"
							action={
								<Button variant="primary" onClick={() => setCreating(true)}>
									Log an expense
								</Button>
							}
						>
							Costs logged against a programme or one of its activities show up here.
						</EmptyState>
					</div>
				) : (
					<ul className="card overflow-hidden">
						{expenses.map((e) => (
							<ExpenseRow key={e.id} expense={e} orgSlug={org.slug} canApprove={canApprove} />
						))}
					</ul>
				)}
			</div>

			<NewExpenseDialog open={creating} onClose={() => setCreating(false)} orgSlug={org.slug} />
		</AppShell>
	);
}
