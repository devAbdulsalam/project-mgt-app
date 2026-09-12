import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, ChevronLeft, Eye, Globe, Lock, Pencil, Plus, Search, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, CardHeader, Dialog, EmptyState, Field, Input, LabelChip, Pill, Select, Textarea } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { relativeTime, useNow } from '@/shared/lib/time';
import { toast } from '@/shared/lib/toast-store';
import { memberById, useDb } from '@/mocks/db';
import type { KbArticle } from '@/mocks/types';
import { RichText } from '@/features/tickets/components/TicketDetailParts';
import { useActor } from '@/features/tickets/hooks/useActor';
import { kbCategories, type KbSearch } from './model';

const schema = z.object({ title: z.string().trim().min(4, 'Give the article a title'), category: z.string().min(1), summary: z.string().trim().min(10, 'One sentence summary'), body: z.string().trim().min(20, 'Write the article body'), visibility: z.enum(['internal', 'public']), tags: z.string().optional(), status: z.enum(['Published', 'Draft']) });
type Form = z.infer<typeof schema>;

function ArticleDialog({ open, onClose, article, onSaved }: { open: boolean; onClose: () => void; article?: KbArticle; onSaved: (slug: string) => void }) {
	const actor = useActor();
	const createArticle = useDb((s) => s.createArticle);
	const updateArticle = useDb((s) => s.updateArticle);
	const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: article ? { title: article.title, category: article.category, summary: article.summary, body: article.body, visibility: article.visibility, tags: article.tags.join(', '), status: article.status } : { title: '', category: kbCategories[0]!, summary: '', body: '', visibility: 'internal', tags: '', status: 'Published' } });
	const submit = form.handleSubmit((v) => {
		const tags = (v.tags ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
		if (article) { updateArticle(article.id, { ...v, tags, readMin: Math.max(1, Math.round(v.body.split(/\s+/).length / 180)) }); toast('Article updated', { tone: 'success' }); onSaved(article.slug); }
		else { const a = createArticle({ ...v, tags }, actor); toast(`"${a.title}" ${a.status === 'Draft' ? 'saved as draft' : 'published'}`, { tone: 'success' }); onSaved(a.slug); }
		onClose();
	});
	return (
		<Dialog open={open} onClose={onClose} title={article ? 'Edit article' : 'New article'} width="max-w-[760px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{article ? 'Save' : 'Publish'}</Button></div>}>
			<form onSubmit={submit} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
				<Field label="Title" required error={form.formState.errors.title?.message} className="sm:col-span-2">{(id) => <Input id={id} {...form.register('title')} />}</Field>
				<Field label="Category">{(id) => <Select id={id} {...form.register('category')}>{kbCategories.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
				<Field label="Visibility">{(id) => <Select id={id} {...form.register('visibility')}><option value="internal">Internal · team only</option><option value="public">Public · client portal</option></Select>}</Field>
				<Field label="Summary" required error={form.formState.errors.summary?.message} className="sm:col-span-2">{(id) => <Input id={id} placeholder="One sentence shown in search results" {...form.register('summary')} />}</Field>
				<Field label="Body" required hint="Markdown: **bold**, numbered steps, `code`" error={form.formState.errors.body?.message} className="sm:col-span-2">{(id) => <Textarea id={id} rows={12} className="font-mono text-[12px]" {...form.register('body')} />}</Field>
				<Field label="Tags" hint="comma separated">{(id) => <Input id={id} placeholder="m365, identity" {...form.register('tags')} />}</Field>
				<Field label="Status">{(id) => <Select id={id} {...form.register('status')}><option>Published</option><option>Draft</option></Select>}</Field>
			</form>
		</Dialog>
	);
}

export function KbPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/kb' });
	const kb = useDb((s) => s.kb);
	const now = useNow(60_000);
	const [creating, setCreating] = useState(false);
	const setSearch = (patch: Partial<KbSearch>) => navigate({ to: '/$org/kb', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });
	const list = useMemo(() => kb.filter((a) => (search.visibility === 'all' ? true : search.visibility === 'draft' ? a.status === 'Draft' : a.visibility === search.visibility && a.status === 'Published')).filter((a) => !search.category || a.category === search.category).filter((a) => !search.q || `${a.title} ${a.summary} ${a.tags.join(' ')} ${a.body}`.toLowerCase().includes(search.q.toLowerCase())).sort((a, b) => b.views - a.views), [kb, search]);
	const categories = Array.from(new Set([...kbCategories, ...kb.map((a) => a.category)])).map((c) => ({ name: c, count: kb.filter((a) => a.category === c).length })).filter((c) => c.count > 0);
	const popular = [...kb].filter((a) => a.status === 'Published').sort((a, b) => b.views - a.views).slice(0, 3);

	return (
		<AppShell meta={{ title: 'Knowledge base', subtitle: `${kb.filter((a) => a.status === 'Published').length} articles · ${kb.filter((a) => a.visibility === 'public').length} public on the portal` }} mobileHeader={<MobileHeader><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Knowledge base</h1><button type="button" onClick={() => setCreating(true)} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900"><Plus size={14} /> New</button></div><label className="input mt-3 h-10 border-transparent bg-white/10 text-white"><Search size={15} className="text-on-dark-muted" aria-hidden /><input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search articles" className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-on-dark-muted" aria-label="Search articles" /></label></MobileHeader>}>
			<div className="hidden items-center gap-3 lg:flex">
				<label className="input h-10 max-w-[560px] flex-1"><Search size={16} className="text-t2" aria-hidden /><input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder='Search articles, e.g. "reset M365 password" or "POS offline"' className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search articles" /><span className="kbd">/</span></label>
				<div className="ms-auto flex items-center gap-1 rounded-sm border border-border-strong bg-white p-0.5" role="group" aria-label="Visibility">{(['all', 'public', 'internal', 'draft'] as const).map((v) => <button key={v} type="button" onClick={() => setSearch({ visibility: v })} className={cn('h-7 rounded-[6px] px-2.5 text-xs capitalize', search.visibility === v ? 'bg-brand-100 font-semibold text-brand-900' : 'text-t2 hover:bg-muted')} aria-pressed={search.visibility === v}>{v}</button>)}</div>
				<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> New article</Button>
			</div>

			<div className="mt-0 grid gap-4 lg:mt-4 lg:grid-cols-[240px_minmax(0,1fr)] [&>*]:min-w-0">
				<div className="space-y-4">
					<Card className="p-3">
						<h3 className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-t2 uppercase">Categories</h3>
						<ul>
							<li><button type="button" onClick={() => setSearch({ category: undefined })} className={cn('flex w-full items-center rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-muted', !search.category && 'bg-brand-100 font-semibold text-brand-900')}>All articles<span className="ms-auto text-xs text-t2">{kb.length}</span></button></li>
							{categories.map((c) => <li key={c.name}><button type="button" onClick={() => setSearch({ category: search.category === c.name ? undefined : c.name })} className={cn('flex w-full items-center rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-muted', search.category === c.name && 'bg-brand-100 font-semibold text-brand-900')}>{c.name}<span className="ms-auto text-xs text-t2">{c.count}</span></button></li>)}
						</ul>
					</Card>
					<Card className="hidden p-4 lg:block"><CardHeader title="Popular" /><ul className="mt-2 space-y-2 text-[13px]">{popular.map((a) => <li key={a.id}><Link to="/$org/kb/$slug" params={{ org: org.slug, slug: a.slug }} className="flex items-start gap-2 hover:underline"><BookOpen size={14} className="mt-0.5 shrink-0 text-t3" aria-hidden /><span className="min-w-0 flex-1">{a.title}<span className="block text-xs text-t2">{a.views} views · {a.readMin} min read</span></span></Link></li>)}</ul></Card>
				</div>
				<div className="space-y-3">
					{list.length === 0 ? <Card><EmptyState icon={<BookOpen size={20} />} title="No articles match" action={<Button variant="primary" onClick={() => setCreating(true)}>Write the first one</Button>} /></Card> : null}
					{list.map((a) => { const author = memberById(a.authorId); return (
						<Link key={a.id} to="/$org/kb/$slug" params={{ org: org.slug, slug: a.slug }} className="card block p-4 hover:border-border-strong">
							<div className="flex flex-wrap items-center gap-2 text-xs text-t2"><span className="rounded-[6px] bg-muted px-2 py-0.5 font-medium text-t1">{a.category}</span>{a.visibility === 'public' ? <Pill tone="done"><Globe size={10} /> Public</Pill> : <Pill tone="closed"><Lock size={10} /> Internal</Pill>}{a.status === 'Draft' ? <Pill tone="open">Draft</Pill> : null}<span className="ms-auto">{a.readMin} min read · {a.views} views</span></div>
							<b className="mt-2 block text-[15px]">{a.title}</b>
							<p className="mt-1 text-[13px] text-t2">{a.summary}</p>
							<div className="mt-2.5 flex flex-wrap items-center gap-1.5">{a.tags.map((t) => <LabelChip key={t}>{t}</LabelChip>)}<span className="ms-auto flex items-center gap-1.5 text-xs text-t2">{author ? <Avatar name={author.name} tint={author.tint} size="xs" /> : null}{author?.name.split(' ')[0]} · updated {relativeTime(a.updatedAt, now)}</span></div>
						</Link>
					); })}
				</div>
			</div>
			<ArticleDialog open={creating} onClose={() => setCreating(false)} onSaved={(slug) => navigate({ to: '/$org/kb/$slug', params: { org: org.slug, slug } })} />
		</AppShell>
	);
}

export function KbArticlePage() {
	const org = useAuthStore((s) => s.org)!;
	const { slug } = useParams({ from: '/authed/$org/kb/$slug' });
	const navigate = useNavigate();
	const kb = useDb((s) => s.kb);
	const article = kb.find((a) => a.slug === slug);
	const voteArticle = useDb((s) => s.voteArticle);
	const viewArticle = useDb((s) => s.viewArticle);
	const updateArticle = useDb((s) => s.updateArticle);
	const deleteArticle = useDb((s) => s.deleteArticle);
	const now = useNow(60_000);
	const [editing, setEditing] = useState(false);
	const [voted, setVoted] = useState<'up' | 'down'>();
	const [viewedSlug, setViewedSlug] = useState<string>();
	if (article && viewedSlug !== article.slug) { setViewedSlug(article.slug); setTimeout(() => viewArticle(article.id), 0); }

	if (!article) return <AppShell meta={{ title: 'Article not found' }}><Card><EmptyState title="That article doesn't exist" action={<Link to="/$org/kb" params={{ org: org.slug }} search={{}}><Button variant="primary">Back to knowledge base</Button></Link>} /></Card></AppShell>;
	const author = memberById(article.authorId);
	const related = kb.filter((a) => a.id !== article.id && a.status === 'Published' && (a.category === article.category || a.tags.some((t) => article.tags.includes(t)))).slice(0, 4);

	return (
		<AppShell meta={{ title: article.title, subtitle: `Knowledge base › ${article.category}` }} mobileHeader={<MobileHeader><Link to="/$org/kb" params={{ org: org.slug }} search={{}} className="flex items-center gap-1 text-[13px] text-on-dark-muted"><ChevronLeft size={16} /> Knowledge base</Link><h1 className="mt-1 text-lg font-semibold">{article.title}</h1></MobileHeader>}>
			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
				<Card className="p-6 sm:p-8">
					<div className="flex flex-wrap items-center gap-2 text-xs text-t2"><Link to="/$org/kb" params={{ org: org.slug }} search={{ category: article.category }} className="rounded-[6px] bg-muted px-2 py-0.5 font-medium text-t1 hover:underline">{article.category}</Link>{article.visibility === 'public' ? <Pill tone="done"><Globe size={10} /> Public</Pill> : <Pill tone="closed"><Lock size={10} /> Internal</Pill>}{article.status === 'Draft' ? <Pill tone="open">Draft</Pill> : null}<span className="ms-auto flex items-center gap-1"><Eye size={12} /> {article.views} · {article.readMin} min read</span></div>
					<h2 className="mt-3 text-2xl font-semibold">{article.title}</h2>
					<p className="mt-1.5 text-[15px] text-t2">{article.summary}</p>
					<div className="mt-3 flex items-center gap-2 text-xs text-t2">{author ? <Avatar name={author.name} tint={author.tint} size="sm" /> : null}{author?.name} · updated {relativeTime(article.updatedAt, now)}<span className="ms-auto flex gap-1.5"><Button size="sm" onClick={() => setEditing(true)}><Pencil size={13} aria-hidden /> Edit</Button><Button size="sm" onClick={() => { updateArticle(article.id, { status: article.status === 'Draft' ? 'Published' : 'Draft' }); toast(article.status === 'Draft' ? 'Published' : 'Moved to drafts', { tone: 'success' }); }}>{article.status === 'Draft' ? 'Publish' : 'Unpublish'}</Button><Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Delete this article?')) { deleteArticle(article.id); navigate({ to: '/$org/kb', params: { org: org.slug }, search: {} }); } }} aria-label="Delete"><Trash2 size={13} /></Button></span></div>
					<hr className="my-5 border-border" />
					<RichText text={article.body} className="text-[15px] leading-7 [&_p]:whitespace-pre-line" />
					<div className="mt-6 flex flex-wrap gap-1.5">{article.tags.map((t) => <LabelChip key={t}>{t}</LabelChip>)}</div>
					<div className="mt-8 flex flex-wrap items-center gap-3 rounded-[10px] bg-muted px-4 py-3 text-[13px]"><span>Was this helpful?</span><Button size="sm" variant={voted === 'up' ? 'primary' : 'secondary'} onClick={() => { if (!voted) { voteArticle(article.id, true); setVoted('up'); } }}><ThumbsUp size={13} aria-hidden /> Yes · {article.helpful}</Button><Button size="sm" variant={voted === 'down' ? 'primary' : 'secondary'} onClick={() => { if (!voted) { voteArticle(article.id, false); setVoted('down'); } }}><ThumbsDown size={13} aria-hidden /> No · {article.notHelpful}</Button>{voted ? <span className="text-xs text-t2">Thanks for the feedback.</span> : null}</div>
				</Card>
				<div className="space-y-4">
					<Card className="p-5"><CardHeader title="Related articles" /><ul className="mt-2 space-y-2 text-[13px]">{related.length === 0 ? <li className="text-t3">Nothing related yet.</li> : related.map((a) => <li key={a.id}><Link to="/$org/kb/$slug" params={{ org: org.slug, slug: a.slug }} className="flex items-start gap-2 hover:underline"><BookOpen size={14} className="mt-0.5 shrink-0 text-t3" aria-hidden /><span className="min-w-0 flex-1">{a.title}<span className="block text-xs text-t2">{a.category} · {a.readMin} min</span></span></Link></li>)}</ul></Card>
					<Card className="p-5"><CardHeader title="Usage" /><dl className="mt-2 space-y-1.5 text-[13px]"><div className="flex justify-between"><dt className="text-t2">Views</dt><dd className="tabular">{article.views}</dd></div><div className="flex justify-between"><dt className="text-t2">Helpful</dt><dd className="tabular">{article.helpful} / {article.helpful + article.notHelpful}</dd></div><div className="flex justify-between"><dt className="text-t2">Linked from tickets</dt><dd className="tabular">{Math.max(0, Math.round(article.views / 40))}</dd></div><div className="flex justify-between"><dt className="text-t2">Portal</dt><dd>{article.visibility === 'public' ? 'Shown to clients' : 'Hidden'}</dd></div></dl></Card>
				</div>
			</div>
			<ArticleDialog open={editing} onClose={() => setEditing(false)} article={article} onSaved={() => undefined} />
		</AppShell>
	);
}
