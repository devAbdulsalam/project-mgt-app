// The audit trail.
//
// Readable by `support` on purpose — a log only one person can read is a log
// nobody checks — so this page has no role gate of its own.
//
// The `detail` column holds whatever the server recorded: a reason, a plan, a
// role. It is free-form JSON rather than a fixed schema, so it is rendered as
// pretty-printed text inside a disclosure instead of being mapped to columns.
// That is the honest rendering of "we log what happened" — the alternative is a
// table with eleven columns that are empty nine times out of ten.

import { useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { ChevronRight, ScrollText } from 'lucide-react';
import { Card, Input } from '@/shared/ui';
import { useConsoleQuery } from '../hooks/useConsoleQuery';
import { auditQuery } from '../api/queries';
import { auditSearchSchema, type AuditEntry, type AuditSearch } from '../model';
import { ErrorState, LoadingRows, PageHeader, TableShell, Td, Th } from '../components/Primitives';
import { relativeTime } from '../hooks/useElevationClock';
import { cn } from '@/shared/lib/cn';

export function ConsoleAuditPage() {
	const search = useSearch({ from: '/console/audit' }) as AuditSearch;

	// Two independent filters, so neither can clobber the other.
	const [action, setAction] = useState(search.action ?? '');
	const [targetId, setTargetId] = useState(search.targetId ?? '');

	const { data, loading, isFetching, error, refetch, gate } = useConsoleQuery(
		auditQuery(auditSearchSchema.parse({ ...search, action: action || undefined, targetId: targetId || undefined }))
	);

	// Note: the filters are deliberately local rather than written back to the
	// URL. This list is a tail an operator is watching while investigating, not a
	// result page anyone links to, and a navigation per keystroke would refetch a
	// 200-row window. The URL still seeds them, so a reload of the bare route
	// starts from the same place.

	return (
		<>
			<PageHeader
				title="Audit trail"
				sub="Every operator action, oldest last. The trail is append-only — there is no endpoint that edits or deletes an entry, and a reason you gave is preserved verbatim."
			/>

			<div className="mb-4 flex flex-wrap items-center gap-3">
				<label className="flex items-center gap-2 text-xs text-t2">
					Action
					<Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="user.disabled" className="w-52" aria-label="Filter by action" />
				</label>
				<label className="flex items-center gap-2 text-xs text-t2">
					Target ID
					<Input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="any id" className="w-56" aria-label="Filter by target id" />
				</label>
				{isFetching && !loading ? <span className="text-[11px] text-t3">Updating…</span> : null}
			</div>

			{gate}

			<TableShell>
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<Th>When</Th>
							<Th>Action</Th>
							<Th>Actor</Th>
							<Th>Target</Th>
							<Th>IP</Th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<LoadingRows rows={10} cols={5} />
						) : (
							data?.map((entry) => <AuditRow key={entry.id} entry={entry} />)
						)}
					</tbody>
				</table>

				{!loading && !error && !data?.length ? (
					<div className="grid place-items-center px-6 py-14 text-center">
						<ScrollText size={18} className="text-t3" aria-hidden />
						<p className="mt-2 text-sm font-semibold text-t1">Nothing matches</p>
						<p className="mt-1 text-[13px] text-t2">No entry for those filters. Try a broader action or a shorter id.</p>
					</div>
				) : null}
				{error ? <ErrorState message={error} onRetry={refetch} /> : null}
			</TableShell>

			<Card className="mt-4 p-4">
				<p className="text-[12px] leading-relaxed text-t2">
					Showing the {search.limit}-most recent matching entries. The server keeps the trail for a fixed window; for anything
					older, ask whoever owns the database.
				</p>
			</Card>
		</>
	);
}

function AuditRow({ entry }: { entry: AuditEntry }) {
	const [open, setOpen] = useState(false);
	const detail = entry.detail;

	// Nothing to expand is the common case, so the chevron only appears when the
	// server actually recorded something beyond the columns.
	const expandable = detail !== null && detail !== undefined && JSON.stringify(detail) !== '{}';

	return (
		<>
			<tr className="border-b border-border last:border-0">
				<Td className="whitespace-nowrap text-xs text-t2">
					{/* Relative for scanning, absolute on hover — an audit entry is
					    evidence, and "3 hours ago" is not a timestamp anyone can cite. */}
					<span title={new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19)}>{relativeTime(entry.createdAt)}</span>
				</Td>
				<Td className="font-mono text-[12px]">{entry.action}</Td>
				<Td className="text-[12px] text-t2">{entry.actorEmail}</Td>
				<Td className="text-[12px] text-t2">
					{expandable ? (
						<button
							type="button"
							onClick={() => setOpen((v) => !v)}
							aria-expanded={open}
							className="inline-flex items-center gap-1 text-left text-[12px] font-medium text-brand-900 no-underline hover:underline"
						>
							<ChevronRight size={12} className={cn('transition-transform', open && 'rotate-90')} aria-hidden />
							{entry.targetKind ? `${entry.targetKind} ` : ''}
							{entry.targetId ?? '—'}
						</button>
					) : (
						<span>
							{entry.targetKind ? `${entry.targetKind} ` : ''}
							{entry.targetId ?? '—'}
						</span>
					)}
				</Td>
				<Td className="text-[12px] text-t3">{entry.ip ?? '—'}</Td>
			</tr>
			{open && expandable ? (
				<tr className="border-b border-border bg-muted/40 last:border-0">
					<Td className="px-4 py-3">
						<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-t2">
							{JSON.stringify(detail, null, 2)}
						</pre>
					</Td>
				</tr>
			) : null}
		</>
	);
}
