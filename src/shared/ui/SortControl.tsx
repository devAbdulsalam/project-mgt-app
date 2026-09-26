import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { Select } from './Field';

export type SortDir = 'asc' | 'desc';

interface Props<K extends string> {
	value: K;
	dir: SortDir;
	options: { value: K; label: string }[];
	onChange: (patch: { sort?: K; dir?: SortDir }) => void;
	label?: string;
}

/** A "sort by" picker with an ascending/descending toggle. */
export function SortControl<K extends string>({ value, dir, options, onChange, label = 'Sort by' }: Props<K>) {
	return (
		<div className="flex items-center gap-1.5">
			<Select className="h-9 w-40" value={value} onChange={(e) => onChange({ sort: e.target.value as K })} aria-label={label}>
				{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
			</Select>
			<button
				type="button"
				onClick={() => onChange({ dir: dir === 'asc' ? 'desc' : 'asc' })}
				className="grid size-9 place-items-center rounded-sm border border-border-strong bg-white text-t2 hover:text-t1"
				aria-label={dir === 'asc' ? 'Ascending — switch to descending' : 'Descending — switch to ascending'}
			>
				{dir === 'asc' ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}
			</button>
		</div>
	);
}
