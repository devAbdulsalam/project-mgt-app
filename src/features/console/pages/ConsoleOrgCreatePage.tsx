// Creating a workspace.
//
// The one place in the product where an operator acts on someone else's behalf:
// the server takes an existing account's email and makes it the owner, in the
// same transaction. There is no invite step here and no pending state — so the
// form's job is to make the operator pick the right existing account, which is
// why owner email is a required field and not an optional one.
//
// The slug is the workspace's permanent identity: it appears in URLs, in mail,
// and in support conversations, and the server will not change it later. It is
// lowercased and hyphen-checked here so an operator finds out about a typo before
// the round trip.

import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, Select } from '@/shared/ui';
import { toast } from '@/shared/lib/toast-store';
import { createOrgMutation } from '../api/mutations';
import { classify, fieldError, refusalMessage } from '../lib/errors';
import { useConsoleStore } from '../store';
import { PLANS, PLAN_LABEL } from '../lib/constants';
import type { Plan } from '../model';

/** Lowercase, hyphenated, no leading or trailing dash. The server's own rule, roughly. */
const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export function ConsoleOrgCreatePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const operator = useConsoleStore((s) => s.operator);
	const isOperator = operator !== null;

	const [form, setForm] = useState({ name: '', slug: '', prefix: '', plan: 'trial' as Plan, ownerEmail: '' });
	// Set once the operator edits the slug, so the name stops overwriting it.
	const [slugTouched, setSlugTouched] = useState(false);

	const create = useMutation({
		...createOrgMutation(queryClient),
		onSuccess: (org) => {
			toast('Workspace created', { description: `${org.name} is live, owned by ${form.ownerEmail}.`, tone: 'success' });
			// Straight to the new workspace: the operator's next question is almost
			// always "did it work", and the detail screen answers it.
			void navigate({ to: '/console/workspaces/$slug', params: { slug: org.slug } });
		},
	});

	const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

	const slugSource = slugify(form.slug);

	const email = form.ownerEmail.trim();
	const valid = form.name.trim().length >= 2 && slugSource.length >= 2 && email.includes('@');

	// Per-field messages from the server beat anything this form could invent.
	const errors = create.isError
		? {
				name: fieldError(create.error, 'name', ''),
				slug: fieldError(create.error, 'slug', ''),
				prefix: fieldError(create.error, 'prefix', ''),
				plan: fieldError(create.error, 'plan', ''),
				owner_email: fieldError(create.error, 'owner_email', ''),
			}
		: {};

	return (
		<>
			<div className="mb-4">
				<Link to="/console/workspaces" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-t2 no-underline hover:text-t1">
					<ArrowLeft size={14} aria-hidden />
					All workspaces
				</Link>
			</div>

			<div className="mb-5">
				<h1 className="text-xl font-semibold text-t1">New workspace</h1>
				<p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-t2">
					Creates a workspace and makes an existing account its owner. The owner receives no mail — they will simply find the
					workspace in their list the next time they sign in.
				</p>
			</div>

			<div className="max-w-[620px]">
				<Card className="p-0">
					<CardHeader title="Details" className="p-5 pb-2" />
					<form
						className="space-y-4 px-5 pb-5"
						onSubmit={(e) => {
							e.preventDefault();
							if (!valid || create.isPending) return;
							create.mutate({
								name: form.name.trim(),
								slug: slugSource,
								prefix: form.prefix.trim() || null,
								plan: form.plan,
								ownerEmail: email,
							});
						}}
					>
						<Field label="Name" required hint="shown to members in the sidebar" error={errors.name || undefined}>
							{(id, describedBy) => (
								<Input
									id={id}
									aria-describedby={describedBy}
									autoFocus
									value={form.name}
									invalid={Boolean(errors.name)}
									onChange={(e) => {
										const name = e.target.value;
										// Until the operator edits the slug themselves, it is derived from
										// the name — which is right nearly every time, and wrong the moment
										// they have a reason to type it.
										if (slugTouched) set({ name });
										else setForm((f) => ({ ...f, name, slug: slugify(name) }));
									}}
									placeholder="Northwind Support"
								/>
							)}
						</Field>

						<Field
							label="Slug"
							required
							hint="permanent — appears in URLs and mail, and cannot be changed later"
							error={errors.slug || undefined}
						>
							{(id, describedBy) => (
								<Input
									id={id}
									aria-describedby={describedBy}
									value={form.slug}
									invalid={Boolean(errors.slug)}
									onChange={(e) => {
										setSlugTouched(true);
										set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') });
									}}
									placeholder="northwind"
								/>
							)}
						</Field>

						<Field label="Ticket prefix" hint="optional — e.g. NW gives tickets like NW-1042" error={errors.prefix || undefined}>
							{(id, describedBy) => (
								<Input
									id={id}
									aria-describedby={describedBy}
									value={form.prefix}
									invalid={Boolean(errors.prefix)}
									onChange={(e) => set({ prefix: e.target.value.toUpperCase().slice(0, 6) })}
									placeholder="NW"
									className="w-32"
								/>
							)}
						</Field>

						<Field label="Plan" required error={errors.plan || undefined}>
							{(id, describedBy) => (
								<Select
									id={id}
									aria-describedby={describedBy}
									value={form.plan}
									invalid={Boolean(errors.plan)}
									onChange={(e) => set({ plan: e.target.value as Plan })}
								>
									{PLANS.map((p) => (
										<option key={p} value={p}>
											{PLAN_LABEL[p]}
										</option>
									))}
								</Select>
							)}
						</Field>

						<Field
							label="Owner email"
							required
							hint="must be an account that already exists — nobody is invited"
							error={errors.owner_email || undefined}
						>
							{(id, describedBy) => (
								<Input
									id={id}
									aria-describedby={describedBy}
									type="email"
									value={form.ownerEmail}
									invalid={Boolean(errors.owner_email)}
									onChange={(e) => set({ ownerEmail: e.target.value })}
									placeholder="owner@northwind.com"
								/>
							)}
						</Field>

						{/* A server refusal that is not tied to one field — slug_taken is
						    the common one, and it arrives on the slug. */}
						{create.isError && !Object.values(errors).some(Boolean) ? (
							<p role="alert" className="text-xs text-danger">
								{refusalMessage(classify(create.error, isOperator))}
							</p>
						) : null}

						<div className="flex items-center justify-end gap-2 pt-1">
							<Link to="/console/workspaces">
								<Button variant="ghost" type="button">
									Cancel
								</Button>
							</Link>
							<Button type="submit" loading={create.isPending} disabled={!valid}>
								Create workspace
							</Button>
						</div>
					</form>
				</Card>
			</div>
		</>
	);
}
