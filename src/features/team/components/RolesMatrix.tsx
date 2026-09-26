import { Check } from 'lucide-react';
import { Card, EmptyState } from '@/shared/ui';
import { useRoles } from '../hooks/useTeam';

/** The server's roles and permissions, read-only: roles are fixed, so there is nothing to toggle. */
export function RolesMatrix({ orgSlug }: { orgSlug: string }) {
	const { data, isPending, isError } = useRoles(orgSlug);

	if (isPending) return <Card className="mt-4 p-6 text-[13px] text-t2">Loading roles…</Card>;
	if (isError || !data) return <Card className="mt-4"><EmptyState title="Could not load roles" /></Card>;

	const groups = Array.from(new Set(data.permissions.map((p) => p.group)));
	return (
		<Card className="mt-4 overflow-x-auto">
			<table className="w-full min-w-[640px] text-[13px]">
				<thead>
					<tr className="bg-muted text-[11px] font-semibold tracking-wider text-t2 uppercase">
						<th className="px-5 py-3 text-left">Permission</th>
						{data.roles.map((r) => <th key={r.id} className="px-3 py-3 text-center">{r.label}<div className="text-[11px] font-normal normal-case tracking-normal">{r.member_count} {r.member_count === 1 ? 'person' : 'people'}</div></th>)}
					</tr>
				</thead>
				<tbody>
					{groups.map((g) => (
						<GroupRows key={g} title={g} perms={data.permissions.filter((p) => p.group === g)} roles={data.roles} />
					))}
				</tbody>
			</table>
			<div className="flex flex-wrap items-center gap-5 border-t border-border px-5 py-3 text-xs text-t2">
				<span className="flex items-center gap-1.5"><span className="size-4 rounded-[5px] bg-brand-900" /> Allowed</span>
				<span className="flex items-center gap-1.5"><span className="size-4 rounded-[5px] border border-border-strong" /> Not allowed</span>
				<span className="ms-auto">Roles are fixed · change what someone can do by changing their role on the Team page</span>
			</div>
		</Card>
	);
}

function GroupRows({ title, perms, roles }: { title: string; perms: { id: string; label: string }[]; roles: { id: string; label: string; permissions: string[] }[] }) {
	return (
		<>
			<tr><td colSpan={roles.length + 1} className="border-t border-border bg-[#fafbfc] px-5 py-2 text-[11px] font-semibold tracking-wider text-t2 uppercase">{title}</td></tr>
			{perms.map((p) => (
				<tr key={p.id} className="border-t border-border">
					<td className="px-5 py-3">{p.label}</td>
					{roles.map((r) => {
						const allowed = r.permissions.includes(p.id);
						return (
							<td key={r.id} className="px-3 py-3 text-center">
								<span role="img" aria-label={`${p.label} for ${r.label}: ${allowed ? 'allowed' : 'not allowed'}`} className={allowed ? 'mx-auto grid size-[22px] place-items-center rounded-[6px] border border-brand-900 bg-brand-900 text-white' : 'mx-auto grid size-[22px] place-items-center rounded-[6px] border border-border-strong bg-white'}>{allowed ? <Check size={13} strokeWidth={3} /> : null}</span>
							</td>
						);
					})}
				</tr>
			))}
		</>
	);
}
