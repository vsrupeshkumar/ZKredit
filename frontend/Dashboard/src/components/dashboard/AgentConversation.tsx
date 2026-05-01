/**
 * Zkredit - Agent Conversation Viewer
 * Shows negotiation chat between agents and Masumi's thought process
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Brain, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from '@/lib/api/config';

interface ConversationMessage {
    id: string;
    timestamp: string;
    agent: 'lenny' | 'luna' | 'system';
    type: 'message' | 'thought' | 'action';
    content: string;
    confidence?: number;
    reasoning?: string;
}

interface XAILog {
    timestamp: number;
    agent: string;
    decision: string;
    reasoning: string;
    confidence: number;
}

interface AgentConversationProps {
    conversationId?: string;
    compact?: boolean;
}

export function AgentConversation({ conversationId, compact = false }: AgentConversationProps) {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [xaiLogs, setXaiLogs] = useState<XAILog[]>([]);
    const [activeTab, setActiveTab] = useState<'conversation' | 'thoughts'>('conversation');

    // Define callbacks first to avoid hoisting issues
    const fetchConversation = useCallback(async () => {
        try {
            const endpoint = conversationId
                ? buildApiUrl(`/api/conversation/${conversationId}`)
                : buildApiUrl('/api/conversation/latest');
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setMessages(data.messages);
                    return; // Don't use mock data if we got real data
                }
            }
        } catch (err) {
            console.error('Failed to fetch conversation:', err);
        }

        // Only use mock data if no conversation ID and no real data
        if (!conversationId) {
            setMessages(prev => {
                if (prev.length > 0) return prev;
                return [
                    {
                        id: '1',
                        timestamp: new Date().toISOString(),
                        agent: 'system',
                        type: 'message',
                        content: 'Loan offer received: 8.5% interest rate, 1000 ADA principal'
                    },
                    {
                        id: '2',
                        timestamp: new Date().toISOString(),
                        agent: 'lenny',
                        type: 'thought',
                        content: 'Analyzing offer... Market average is 7.5%. This rate is 1% above average.',
                        confidence: 0.85,
                        reasoning: 'Rate is acceptable but could be negotiated lower'
                    },
                    {
                        id: '3',
                        timestamp: new Date().toISOString(),
                        agent: 'lenny',
                        type: 'message',
                        content: 'Counter-offer: 7.0% interest rate. This is more aligned with current market conditions.'
                    },
                    {
                        id: '4',
                        timestamp: new Date().toISOString(),
                        agent: 'luna',
                        type: 'thought',
                        content: 'Evaluating counter-offer... Borrower has good credit (750). Acceptable rate.',
                        confidence: 0.78
                    },
                    {
                        id: '5',
                        timestamp: new Date().toISOString(),
                        agent: 'luna',
                        type: 'message',
                        content: 'Counter-offer: 7.5% - meeting in the middle. This balances risk and return.'
                    },
                    {
                        id: '6',
                        timestamp: new Date().toISOString(),
                        agent: 'lenny',
                        type: 'thought',
                        content: '7.5% is acceptable. Saves 1% from original offer. Accepting terms.',
                        confidence: 0.92,
                        reasoning: 'Rate is at market average, credit score is good, savings achieved'
                    },
                    {
                        id: '7',
                        timestamp: new Date().toISOString(),
                        agent: 'lenny',
                        type: 'message',
                        content: 'Accepted! Final rate: 7.5%. Proceeding to settlement.'
                    },
                    {
                        id: '8',
                        timestamp: new Date().toISOString(),
                        agent: 'system',
                        type: 'action',
                        content: 'Settlement transaction submitted to Aiken validator'
                    }
                ];
            });
        }
    }, [conversationId]);

    const fetchXAILogs = useCallback(async () => {
        try {
            const res = await fetch(buildApiUrl('/api/agent/xai-logs?limit=20'));
            if (res.ok) {
                const data = await res.json();
                setXaiLogs(data);
            }
        } catch (err) {
            // Mock data
            setXaiLogs(prev => {
                if (prev.length > 0) return prev;
                return [
                    {
                        timestamp: Date.now() - 300000,
                        agent: 'lenny',
                        decision: 'accept_loan',
                        reasoning: 'Rate of 7.5% is below market average of 7.5%. Negotiated down from 8.5%, saving 1.5%.',
                        confidence: 0.85
                    },
                    {
                        timestamp: Date.now() - 180000,
                        agent: 'luna',
                        decision: 'counter_offer',
                        reasoning: 'Borrower credit score 750 is good. 7.5% rate balances risk and return.',
                        confidence: 0.78
                    }
                ];
            });
        }
    }, []);

    useEffect(() => {
        // Reset messages when conversation ID changes
        if (conversationId) {
            setMessages([]);
        }

        // Fetch conversation from API immediately
        fetchConversation();
        fetchXAILogs();

        // Poll for updates (only if we have a conversation ID or want to check for latest)
        const interval = setInterval(() => {
            fetchConversation();
            fetchXAILogs();
        }, 2000);

        return () => clearInterval(interval);
    }, [conversationId, fetchConversation, fetchXAILogs]);

    const getAgentName = (agent: string) => {
        switch (agent) {
            case 'lenny': return 'Lenny (Borrower Agent)';
            case 'luna': return 'Luna (Lender Agent)';
            case 'system': return 'System';
            default: return agent;
        }
    };

    const getAgentIcon = (agent: string) => {
        if (agent === 'system') return <MessageSquare className="w-4 h-4" />;
        return <Bot className="w-4 h-4" />;
    };

    const getAgentColor = (agent: string) => {
        switch (agent) {
            case 'lenny': return 'text-blue-500 bg-blue-500/20 border-blue-500/30';
            case 'luna': return 'text-purple-500 bg-purple-500/20 border-purple-500/30';
            case 'system': return 'text-gray-500 bg-gray-500/20 border-gray-500/30';
            default: return 'text-muted-foreground bg-muted/20';
        }
    };

    if (compact) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Agent Chat</span>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-2 pr-2">
                        {messages.length > 0 ? (
                            messages.slice(-10).map((msg, idx) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-2 rounded text-xs glass-card`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {getAgentIcon(msg.agent)}
                                        <span className="font-medium capitalize">{msg.agent}</span>
                                        {msg.type === 'thought' && (
                                            <span className="text-xs opacity-60">💭</span>
                                        )}
                                    </div>
                                    <p className="line-clamp-2">{msg.content}</p>
                                    <p className="text-xs opacity-60 mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </motion.div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-8">
                                No messages yet
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    return (
        <Card className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Agent Conversations</h3>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'conversation' | 'thoughts')}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="conversation">Negotiation Chat</TabsTrigger>
                    <TabsTrigger value="thoughts">AI Thoughts</TabsTrigger>
                </TabsList>

                <TabsContent value="conversation" className="mt-4">
                    <ScrollArea className="h-96">
                        <div className="space-y-3 pr-4">
                            <AnimatePresence>
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`p-3 rounded-lg border ${msg.type === 'thought' ? 'bg-muted/30' : ''
                                            } ${getAgentColor(msg.agent)}`}
                                    >
                                        <div className="flex items-start gap-2 mb-2">
                                            {getAgentIcon(msg.agent)}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">
                                                        {getAgentName(msg.agent)}
                                                    </span>
                                                    {msg.type === 'thought' && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Brain className="w-3 h-3" />
                                                            Thinking...
                                                        </span>
                                                    )}
                                                </div>
                                                {msg.confidence && (
                                                    <div className="mt-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Confidence:</span>
                                                            <div className="confidence-bar">
                                                                <div
                                                                    className="confidence-bar-fill"
                                                                    style={{ 
                                                                        width: `${Math.min(Math.max((msg.confidence || 0) * 100, 0), 100)}%`,
                                                                        '--confidence-width': `${Math.min(Math.max((msg.confidence || 0) * 100, 0), 100)}%`
                                                                    } as React.CSSProperties}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium">
                                                                {((msg.confidence || 0) * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm mt-2">{msg.content}</p>
                                        {msg.reasoning && (
                                            <div className="mt-2 pt-2 border-t border-border/50">
                                                <p className="text-xs text-muted-foreground">
                                                    <strong>Reasoning:</strong> {msg.reasoning}
                                                </p>
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </p>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {messages.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">
                                    No conversation yet. Start a workflow to see agent negotiations.
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="thoughts" className="mt-4">
                    <ScrollArea className="h-96">
                        <div className="space-y-3 pr-4">
                            <AnimatePresence>
                                {xaiLogs.map((log, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="p-3 rounded-lg border bg-muted/30"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Brain className="w-4 h-4 text-primary" />
                                                <span className="font-medium text-sm capitalize">
                                                    {log.agent} - {log.decision.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-sm mb-2">{log.reasoning}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Confidence:</span>
                                            <div className="confidence-bar">
                                                <div
                                                    className="confidence-bar-fill"
                                                    style={{ width: `${Math.min(Math.max((log.confidence || 0) * 100, 0), 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium">
                                                {((log.confidence || 0) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {xaiLogs.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">
                                    No AI thoughts logged yet.
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </Card>
    );
}

