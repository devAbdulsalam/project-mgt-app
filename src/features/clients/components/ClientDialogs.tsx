import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/shared/ui';
import { useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import { useActor } from '@/features/tickets/hooks/useActor';

const clientSchema = z.object({
	name: z.string().trim().min(2, 'Enter the company name'),
	rc: z.string().trim().optional(),
	industry: z.string().min(1),
	city: z.string().min(1),
	plan: z.enum(['Gold', 'Silver', 'Bronze', 'Trial']),
	contactName: z.string().trim().min(2, 'Who is the primary contact?'),
	contactPhone: z.string().trim().optional(),
	accountManagerId: z.string().min(1),
});
type ClientForm = z.infer<typeof clientSchema>;

export function AddClientDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
	const actor = useActor();
	const addClient = useDb((s) => s.addClient);
	const members = useDb((s) => s.members);
	const form = useForm<ClientForm>({ resolver: zodResolver(clientSchema), defaultValues: { name: '', rc: '', industry: 'Fintech', city: 'Lagos', plan: 'Silver', contactName: '', contactPhone: '', accountManagerId: actor.id } });
	const submit = form.handleSubmit((v) => {
		const c = addClient({ ...v, rc: v.rc ? (v.rc.startsWith('RC') ? v.rc : `RC ${v.rc}`) : '' });
		toast(`${c.name} added`, { tone: 'success', description: `${c.plan} plan · account manager ${members.find((m) => m.id === v.accountManagerId)?.name ?? ''}` });
		form.reset();
		onCreated(c.id);
		onClose();
	});
	return (
		<Dialog open={open} onClose={onClose} title="Add client" width="max-w-[620px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add client</Button></div>}>
			<form onSubmit={submit} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
				<Field label="Company name" required error={form.formState.errors.name?.message} className="sm:col-span-2">{(id) => <Input id={id} placeholder="e.g. Yaba Microfinance Bank" {...form.register('name')} />}</Field>
				<Field label="RC number">{(id) => <Input id={id} placeholder="1234567" {...form.register('rc')} />}</Field>
				<Field label="Plan">{(id) => <Select id={id} {...form.register('plan')}>{['Gold', 'Silver', 'Bronze', 'Trial'].map((p) => <option key={p}>{p}</option>)}</Select>}</Field>
				<Field label="Industry">{(id) => <Select id={id} {...form.register('industry')}>{['Fintech', 'Banking', 'Healthcare', 'Logistics', 'Manufacturing', 'Education', 'Energy', 'Retail', 'Government', 'Other'].map((p) => <option key={p}>{p}</option>)}</Select>}</Field>
				<Field label="City">{(id) => <Select id={id} {...form.register('city')}>{['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu', 'Benin City', 'Kaduna'].map((p) => <option key={p}>{p}</option>)}</Select>}</Field>
				<Field label="Primary contact" required error={form.formState.errors.contactName?.message}>{(id) => <Input id={id} placeholder="Full name" {...form.register('contactName')} />}</Field>
				<Field label="Contact WhatsApp">{(id) => <Input id={id} placeholder="+234 …" {...form.register('contactPhone')} />}</Field>
				<Field label="Account manager" className="sm:col-span-2">{(id) => <Select id={id} {...form.register('accountManagerId')}>{members.filter((m) => m.status === 'Active' && m.id !== 'u_amr').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}</Field>
			</form>
		</Dialog>
	);
}

const siteSchema = z.object({ name: z.string().trim().min(2, 'Site name'), address: z.string().trim().min(2, 'Address'), contactName: z.string().trim().min(2, 'Site contact') });
export function AddSiteDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
	const addSite = useDb((s) => s.addSite);
	const form = useForm<z.infer<typeof siteSchema>>({ resolver: zodResolver(siteSchema), defaultValues: { name: '', address: '', contactName: '' } });
	const submit = form.handleSubmit((v) => { addSite(clientId, v); toast('Site added', { tone: 'success' }); form.reset(); onClose(); });
	return (
		<Dialog open={open} onClose={onClose} title="Add site" width="max-w-[480px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add site</Button></div>}>
			<form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-7">
				<Field label="Site name" required error={form.formState.errors.name?.message}>{(id) => <Input id={id} placeholder="e.g. Yaba branch" {...form.register('name')} />}</Field>
				<Field label="Address" required error={form.formState.errors.address?.message}>{(id) => <Input id={id} {...form.register('address')} />}</Field>
				<Field label="Site contact" required error={form.formState.errors.contactName?.message}>{(id) => <Input id={id} {...form.register('contactName')} />}</Field>
			</form>
		</Dialog>
	);
}

const contactSchema = z.object({ name: z.string().trim().min(2, 'Name'), role: z.string().trim().min(2, 'Role'), channel: z.enum(['whatsapp', 'email', 'phone']), phone: z.string().optional(), email: z.string().optional() });
export function AddContactDialog({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
	const addContact = useDb((s) => s.addContact);
	const form = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema), defaultValues: { name: '', role: '', channel: 'whatsapp', phone: '', email: '' } });
	const submit = form.handleSubmit((v) => { addContact(clientId, v); toast('Contact added', { tone: 'success' }); form.reset(); onClose(); });
	return (
		<Dialog open={open} onClose={onClose} title="Add contact" width="max-w-[480px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add contact</Button></div>}>
			<form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-7">
				<Field label="Name" required error={form.formState.errors.name?.message}>{(id) => <Input id={id} {...form.register('name')} />}</Field>
				<Field label="Role" required error={form.formState.errors.role?.message}>{(id) => <Input id={id} placeholder="e.g. Branch manager" {...form.register('role')} />}</Field>
				<Field label="Preferred channel">{(id) => <Select id={id} {...form.register('channel')}><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="phone">Phone</option></Select>}</Field>
				<Field label="Phone">{(id) => <Input id={id} placeholder="+234 …" {...form.register('phone')} />}</Field>
				<Field label="Email">{(id) => <Input id={id} type="email" {...form.register('email')} />}</Field>
			</form>
		</Dialog>
	);
}

export function NoteComposer({ clientId }: { clientId: string }) {
	const actor = useActor();
	const addNote = useDb((s) => s.addClientNote);
	const form = useForm<{ body: string }>({ defaultValues: { body: '' } });
	return (
		<form onSubmit={form.handleSubmit((v) => { if (!v.body.trim()) return; addNote(clientId, v.body, actor); form.reset(); toast('Note added', { tone: 'success' }); })} className="space-y-2">
			<Textarea rows={3} placeholder="Add an account note… visible to the team only" aria-label="Note" {...form.register('body')} />
			<div className="flex justify-end"><Button type="submit" variant="primary" size="md">Add note</Button></div>
		</form>
	);
}
