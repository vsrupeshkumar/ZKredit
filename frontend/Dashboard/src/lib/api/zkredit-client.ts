/**
 * Zkredit - API Client
 * REST API client for Python backend communication
 */

import { getApiBaseUrl } from '@/lib/api/config';

export interface LoanOffer {
    id: string;
    lender_address: string;
    principal: number;
    initial_interest_rate: number;
    term_months: number;
    offered_at: string;
}

export interface Trade {
    id: string;
    timestamp: Date;
    type: 'loan_accepted' | 'loan_repaid' | 'negotiation';
    principal: number;
    interestRate: number;
    profit?: number;
    status: 'completed' | 'pending';
}

export interface AgentStatus {
    status: 'profiting' | 'negotiating' | 'idle' | 'error';
    current_task?: string;
    last_decision?: string;
}

export interface XAILog {
    timestamp: number;
    decision: string;
    reasoning: string;
    confidence: number;
}

class ZkreditClient {
    private baseURL: string;

    constructor(baseURL: string = getApiBaseUrl()) {
        this.baseURL = baseURL;
    }

    private async fetch(endpoint: string, options?: RequestInit) {
        try {
            const targetUrl = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
            const response = await fetch(targetUrl, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            throw error;
        }
    }

    // Get current loan offers
    async getLoanOffers(): Promise<LoanOffer[]> {
        return this.fetch('/api/loans/offers');
    }

    // Get trade history
    async getTradeHistory(): Promise<Trade[]> {
        const data = await this.fetch('/api/trades/history');
        return data.map((trade: Trade) => ({
            ...trade,
            timestamp: new Date(trade.timestamp),
        }));
    }

    // Get AI agent status
    async getAgentStatus(): Promise<AgentStatus> {
        return this.fetch('/api/agent/status');
    }

    // Get XAI decision logs
    async getXAILogs(limit: number = 50): Promise<XAILog[]> {
        return this.fetch(`/api/agent/xai-logs?limit=${limit}`);
    }

    // Get dashboard stats
    async getDashboardStats() {
        return this.fetch('/api/dashboard/stats');
    }
}

export const zkreditClient = new ZkreditClient(getApiBaseUrl());
