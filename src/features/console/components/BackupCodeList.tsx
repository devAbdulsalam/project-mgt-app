// Recovery codes, rendered and copyable.
//
// Shown exactly once, so the affordances here are about getting them somewhere
// safe rather than about looking tidy: a copy button, a download that works with
// the page closed, and a print stylesheet-friendly layout.
//
// The download is a plain text file, generated in the browser. It is a real
// convenience for the common case (paste into a password manager) and the
// console says plainly that the file is as sensitive as the codes themselves —
// a file called recovery-codes.txt sitting in Downloads is not a secret store,
// and pretending otherwise would be worse than not offering it.

import { Check, Copy, Download } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useCopy } from '../lib/clipboard';

export function BackupCodeList({ codes, className, compact }: { codes: string[]; className?: string; compact?: boolean }) {
	const { copied, copy } = useCopy();
	const text = codes.join('\n');

	const download = () => {
		// Built by hand rather than via Blob + object URL: the URL has to be
		// revoked or the blob stays alive for the life of the document, which for
		// a file full of working credentials is not a thing to leave lying around.
		const blob = new Blob([`Ledge console recovery codes\nGenerated ${new Date().toISOString()}\n\n${text}\n`], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'ledge-recovery-codes.txt';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<div className={cn('rounded-[10px] border border-border-strong bg-muted/60 p-4', className)}>
			<ul className={cn('grid gap-1.5', compact ? 'grid-cols-2 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-2')}>
				{codes.map((code, i) => (
					<li key={code}>
						<code className="block rounded-sm border border-border bg-white px-2.5 py-1.5 text-center font-mono text-[13px] tracking-wider text-t1 tabular">
							<span className="mr-1.5 text-t3 select-none">{i + 1}.</span>
							{code}
						</code>
					</li>
				))}
			</ul>

			<div className="mt-3.5 flex flex-wrap items-center gap-2">
				<Button size="sm" variant="secondary" onClick={() => void copy(text)}>
					{copied ? <Check size={14} /> : <Copy size={14} />}
					{copied ? 'Copied' : 'Copy all'}
				</Button>
				<Button size="sm" variant="secondary" onClick={download}>
					<Download size={14} />
					Download
				</Button>
				<p className="text-[11px] text-t3">Each code works once.</p>
			</div>
		</div>
	);
}

/**
 * Regenerating: the destructive one.
 *
 * Minting a new set voids the old one immediately, so a confirmation that does
 * not name the consequence is a confirmation someone clicks twice. This is a
 * plain confirm — the project's convention is window.confirm for destructive
 * actions, and inventing a bespoke dialog here for one button would be noise.
 */
export function RegenerateBackupCodesButton({ onConfirm, busy }: { onConfirm: () => void; busy?: boolean }) {
	return (
		<Button
			variant="danger"
			size="md"
			loading={busy}
			onClick={() => {
				const ok = window.confirm('Generate a new set of recovery codes?\n\nYour existing codes will stop working immediately. Anyone holding one of them will be locked out.');
				if (ok) onConfirm();
			}}
		>
			Regenerate recovery codes
		</Button>
	);
}
