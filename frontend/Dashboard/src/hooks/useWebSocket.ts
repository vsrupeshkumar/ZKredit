import { useState, useEffect, useRef, useCallback } from 'react';
import { buildApiUrl, getWsUrl } from '@/lib/api/config';

interface AgentStatus {
  status: 'idle' | 'negotiating' | 'analyzing' | 'completed' | 'profiting' | 'error';
  task?: string;
}

interface Conversation {
  conversation_id: string;
  messages: Array<{
    id: string;
    timestamp: string;
    agent: string;
    type: 'message' | 'thought' | 'action' | 'analysis';
    content: string;
    confidence?: number;
    reasoning?: string;
  }>;
}

interface HydraStatus {
  mode: 'hydra' | 'direct' | 'unavailable' | 'minimal';
  connected?: boolean;
  head_state?: string;
  active_negotiations?: number;
  current_head_id?: string;
}

interface WorkflowStep {
  step: number;
  name: string;
  status: string;
  details: Record<string, unknown>;
  timestamp: string;
}

interface DashboardStats {
  totalBalance: number;
  activeLoans: number;
  totalProfit: number;
  agentStatus: string;
}

interface WebSocketState {
  isConnected: boolean;
  agentStatus: AgentStatus;
  currentConversation: Conversation | null;
  hydraStatus: HydraStatus;
  workflowSteps: WorkflowStep[];
  stats: DashboardStats;
}

interface BackendMessage {
  type: string;
  data?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    agentStatus: { status: 'idle' },
    currentConversation: null,
    hydraStatus: { mode: 'unavailable' },
    workflowSteps: [],
    stats: {
      totalBalance: 125450.75,
      activeLoans: 8,
      totalProfit: 12543.5,
      agentStatus: 'idle',
    },
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const fetchLatestConversation = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/conversation/latest'));
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as Conversation;
      if (data.conversation_id && data.messages?.length > 0) {
        setState((prev) => ({
          ...prev,
          currentConversation: data,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  }, []);

  const handleMessage = useCallback(
    (message: BackendMessage) => {
      switch (message.type) {
        case 'connected':
          break;

        case 'agent_status': {
          const data = asRecord(message.data);
          const status = (data?.status as AgentStatus['status']) || 'idle';
          const task = typeof data?.task === 'string' ? data.task : undefined;

          setState((prev) => ({
            ...prev,
            agentStatus: { status, task },
            stats: { ...prev.stats, agentStatus: status },
          }));
          break;
        }

        case 'conversation_update':
          fetchLatestConversation();
          break;

        case 'hydra_status': {
          const data = asRecord(message.data);
          if (data) {
            setState((prev) => ({
              ...prev,
              hydraStatus: {
                mode: (data.mode as HydraStatus['mode']) || 'unavailable',
                connected: typeof data.connected === 'boolean' ? data.connected : undefined,
                head_state: typeof data.head_state === 'string' ? data.head_state : undefined,
                active_negotiations:
                  typeof data.active_negotiations === 'number' ? data.active_negotiations : undefined,
                current_head_id: typeof data.current_head_id === 'string' ? data.current_head_id : undefined,
              },
            }));
          }
          break;
        }

        case 'workflow_step': {
          const data = asRecord(message.data);
          if (!data) {
            break;
          }

          const step: WorkflowStep = {
            step: Number(data.step || 0),
            name: String(data.name || ''),
            status: String(data.status || 'pending'),
            details: asRecord(data.details) || {},
            timestamp: String(data.timestamp || new Date().toISOString()),
          };

          setState((prev) => ({
            ...prev,
            workflowSteps: [...prev.workflowSteps.slice(-9), step],
          }));
          break;
        }

        case 'stats_update': {
          const data = asRecord(message.data);
          if (data) {
            setState((prev) => ({
              ...prev,
              stats: {
                ...prev.stats,
                totalBalance:
                  typeof data.totalBalance === 'number' ? data.totalBalance : prev.stats.totalBalance,
                activeLoans:
                  typeof data.activeLoans === 'number' ? data.activeLoans : prev.stats.activeLoans,
                totalProfit:
                  typeof data.totalProfit === 'number' ? data.totalProfit : prev.stats.totalProfit,
                agentStatus:
                  typeof data.agentStatus === 'string' ? data.agentStatus : prev.stats.agentStatus,
              },
            }));
          }
          break;
        }

        case 'workflow_started':
          setState((prev) => ({
            ...prev,
            workflowSteps: [],
            agentStatus: { status: 'negotiating', task: 'Starting workflow...' },
          }));
          break;

        default:
          break;
      }
    },
    [fetchLatestConversation]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(getWsUrl('/ws'));

      wsRef.current.onopen = () => {
        setState((prev) => ({ ...prev, isConnected: true }));
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as BackendMessage;
          handleMessage(parsed);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setState((prev) => ({ ...prev, isConnected: false }));

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 2000 * reconnectAttempts.current);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    fetchLatestConversation,
  };
}
