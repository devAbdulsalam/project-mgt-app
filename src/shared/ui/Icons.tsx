import { cn } from '@/shared/lib/cn';
import type { Channel, TicketType } from '@/mocks/types';
import { channelMeta, typeMeta } from './meta';

export function ChannelBadge({ channel, className }: { channel: Channel; className?: string }) {
	const m = channelMeta[channel];
	return (
		<span className={cn('inline-flex items-center gap-1.5 text-xs', m.color, className)}>
			<m.icon size={13} aria-hidden />
			{m.label}
		</span>
	);
}

/** Small coloured square identifying the ticket type (as in the designs). */
export function TypeDot({ type, size = 'md', className }: { type: TicketType; size?: 'sm' | 'md' | 'lg'; className?: string }) {
	const m = typeMeta[type];
	return <span className={cn('inline-block shrink-0 rounded-[4px]', m.color, size === 'sm' ? 'size-3' : size === 'lg' ? 'size-5' : 'size-4', className)} role="img" aria-label={m.label} title={m.label} />;
}
