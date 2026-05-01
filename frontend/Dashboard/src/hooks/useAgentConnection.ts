import { useState, useEffect, useCallback, useRef } from 'react';
import { getWsUrl } from '@/lib/api/config';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface AgentLog {
    timestamp: number;
    message: string;
    type: 'info' | 'error' | 'success';
}

interface UseAgentConnectionReturn {
    status: ConnectionStatus;
    logs: AgentLog[];
    isMockMode: boolean;
}

export const useAgentConnection = (url: string = getWsUrl('/ws')): UseAgentConnectionReturn => {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [isMockMode, setIsMockMode] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
        setLogs(prev => [...prev, { timestamp: Date.now(), message, type }].slice(-50));
    }, []);

    const attemptReconnect = useCallback(() => {
        if (reconnectAttempts.current >= maxReconnectAttempts) {
            addLog('Max reconnect attempts reached. Switching to Mock Mode.', 'error');
            setIsMockMode(true);
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 5000);
        addLog(`Reconnecting in ${delay}ms...`);

        setTimeout(() => {
            reconnectAttempts.current++;
            // Call connect directly to avoid circular dependency
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            setStatus('connecting');
            addLog(`Attempting connection to ${url}...`);

            try {
                const ws = new WebSocket(url);

                ws.onopen = () => {
                    setStatus('connected');
                    addLog('Connected to Agent Backend', 'success');
                    reconnectAttempts.current = 0;
                    setIsMockMode(false);
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'log') {
                            addLog(data.message, data.level || 'info');
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                };

                ws.onclose = () => {
                    setStatus('disconnected');
                    addLog('Connection lost', 'error');
                    wsRef.current = null;
                    attemptReconnect();
                };

                ws.onerror = () => {
                    // Error is handled by onclose
                };

                wsRef.current = ws;
            } catch (e) {
                attemptReconnect();
            }
        }, delay);
    }, [url, addLog]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setStatus('connecting');
        addLog(`Attempting connection to ${url}...`);

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                setStatus('connected');
                addLog('Connected to Agent Backend', 'success');
                reconnectAttempts.current = 0;
                setIsMockMode(false);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'log') {
                        addLog(data.message, data.level || 'info');
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            };

            ws.onclose = () => {
                setStatus('disconnected');
                addLog('Connection lost', 'error');
                wsRef.current = null;
                attemptReconnect();
            };

            ws.onerror = () => {
                // Error is handled by onclose
            };

            wsRef.current = ws;
        } catch (e) {
            attemptReconnect();
        }
    }, [url, addLog, attemptReconnect]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return { status, logs, isMockMode };
};
