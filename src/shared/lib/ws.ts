// WebSocket client matching the backend real-time contract (backend plan §12):
// connect with a JWT, subscribe/unsubscribe topics, receive event envelopes with a
// version for optimistic-cache reconciliation, presence notifications, auto-reconnect.

import { WS_ENDPOINT } from '@/api/config';
import { getAccessToken } from './token-store';

export interface WsEventEnvelope {
	topic: string;
	event: string;
	id: string;
	at: string;
	version: number;
	payload: Record<string, unknown>;
}

export type WsStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface WsClientOptions {
	url?: string;
	getToken?: () => string | null;
	/** Heartbeat interval between client and server. */
	heartbeatMs?: number;
	reconnectBaseMs?: number;
	reconnectMaxMs?: number;
}

interface PendingMessage {
	type: string;
	[key: string]: unknown;
}

export interface WsClient {
	connect(): void;
	disconnect(): void;
	subscribe(topics: string[]): void;
	unsubscribe(topics: string[]): void;
	send(message: PendingMessage): void;
	onEvent(handler: (event: WsEventEnvelope) => void): () => void;
	onStatus(handler: (status: WsStatus) => void): () => void;
}

export function createWsClient(options: WsClientOptions = {}): WsClient {
	const url = options.url ?? WS_ENDPOINT;
	const getToken = options.getToken ?? getAccessToken;
	const heartbeatMs = options.heartbeatMs ?? 30_000;
	const reconnectBaseMs = options.reconnectBaseMs ?? 1_000;
	const reconnectMaxMs = options.reconnectMaxMs ?? 30_000;

	let socket: WebSocket | null = null;
	let status: WsStatus = 'idle';
	let reconnectAttempts = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	let manuallyClosed = false;
	let messageSeq = 0;
	const subscriptions = new Set<string>();
	const eventHandlers = new Set<(event: WsEventEnvelope) => void>();
	const statusHandlers = new Set<(status: WsStatus) => void>();

	function setStatus(next: WsStatus) {
		status = next;
		for (const handler of [...statusHandlers]) handler(status);
	}

	function clearHeartbeat() {
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
	}

	function scheduleReconnect() {
		if (manuallyClosed) return;
		reconnectAttempts += 1;
		const delay = Math.min(reconnectBaseMs * 2 ** (reconnectAttempts - 1), reconnectMaxMs);
		setStatus('reconnecting');
		reconnectTimer = setTimeout(() => {
			connect();
		}, delay);
	}

	function open() {
		const token = getToken();
		const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
		socket = new WebSocket(wsUrl);
		socket.addEventListener('open', () => {
			reconnectAttempts = 0;
			setStatus('connected');
			// Re-subscribe everything after a reconnect.
			if (subscriptions.size > 0) sendSubscribe([...subscriptions]);
			heartbeatTimer = setInterval(() => {
				if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
			}, heartbeatMs);
		});
		socket.addEventListener('message', (event) => {
			let message: Record<string, unknown>;
			try {
				message = JSON.parse(String(event.data)) as Record<string, unknown>;
			} catch {
				return;
			}
			if (message.type === 'event') {
				const envelope = message as unknown as WsEventEnvelope;
				for (const handler of [...eventHandlers]) handler(envelope);
			} else if (message.type === 'pong') {
				// Heartbeat ack — nothing to do.
			}
		});
		socket.addEventListener('close', () => {
			clearHeartbeat();
			if (!manuallyClosed) scheduleReconnect();
		});
		socket.addEventListener('error', () => {
			socket?.close();
		});
	}

	function connect() {
		if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
		manuallyClosed = false;
		setStatus('connecting');
		open();
	}

	function disconnect() {
		manuallyClosed = true;
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		clearHeartbeat();
		socket?.close();
		socket = null;
		setStatus('disconnected');
	}

	function sendSubscribe(topics: string[]) {
		const message: PendingMessage = { type: 'subscribe', id: `s${++messageSeq}`, topics };
		if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
	}

	function subscribe(topics: string[]) {
		const fresh = topics.filter((t) => !subscriptions.has(t));
		if (fresh.length === 0) return;
		fresh.forEach((t) => subscriptions.add(t));
		sendSubscribe(fresh);
	}

	function unsubscribe(topics: string[]) {
		topics.forEach((t) => subscriptions.delete(t));
		const message: PendingMessage = { type: 'unsubscribe', id: `u${++messageSeq}`, topics };
		if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
	}

	function send(message: PendingMessage) {
		if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
	}

	function onEvent(handler: (event: WsEventEnvelope) => void) {
		eventHandlers.add(handler);
		return () => {
			eventHandlers.delete(handler);
		};
	}

	function onStatus(handler: (status: WsStatus) => void) {
		statusHandlers.add(handler);
		return () => {
			statusHandlers.delete(handler);
		};
	}

	return { connect, disconnect, subscribe, unsubscribe, send, onEvent, onStatus };
}