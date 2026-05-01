import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Brain, MessageCircle, Activity, CheckCircle2, AlertCircle, Bot, Search, Handshake } from 'lucide-react';
import { useState } from 'react';
import { buildApiUrl } from '@/lib/api/config';

interface AgentStatusProps {
  status: 'idle' | 'negotiating' | 'analyzing';
  task?: string;
  conversation?: {
    conversation_id: string;
    messages: Array<{
      id: string;
      timestamp: string;
      agent: string;
      type: 'message' | 'thought' | 'action';
      content: string;
      confidence?: number;
      reasoning?: string;
    }>;
  } | null;
  workflowSteps: Array<{
    step: number;
    name: string;
    status: string;
    details: {
      message?: string;
      [key: string]: unknown;
    };
    timestamp: string;
  }>;
}

export function AgentStatus({ status, task, conversation, workflowSteps }: AgentStatusProps) {
  const [settling, setSettling] = useState(false);

  const handleManualSettlement = async () => {
    try {
      setSettling(true);
      const response = await fetch(buildApiUrl('/api/negotiation/settle'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('Settlement completed successfully:', result);
        // The WebSocket will handle status updates automatically
      } else {
        console.error('Settlement failed:', result.error);
        alert(`Settlement failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error during settlement:', error);
      alert('Error during settlement. Please try again.');
    } finally {
      setSettling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-gray-500';
      case 'negotiating':
        return 'bg-blue-500';
      case 'analyzing':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'negotiating':
        return <MessageCircle className="w-4 h-4" />;
      case 'analyzing':
        return <Brain className="w-4 h-4" />;
      case 'processing':
        return <Activity className="w-4 h-4 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="grid gap-6">
      {/* Agent Status Card */}
      <Card className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI Agent Collaboration
        </h3>
        <Badge variant="outline" className={`${getStatusColor(status)} text-white border-0`}>
          {getStatusIcon(status)}
          <span className="ml-1 capitalize">{status}</span>
        </Badge>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <p className="text-sm text-muted-foreground">
          <strong>Lenny</strong> (Llama 3) analyzes loan terms and negotiates rates.
          <strong>Masumi</strong> performs Cardano blockchain analysis for borrower verification.
          They work together to provide comprehensive loan assessment.
        </p>
      </div>

        {task && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Current Task:</p>
            <p className="text-sm font-medium">{task}</p>
          </div>
        )}

        {/* Manual Settlement Button */}
        {status === 'completed' && task && task.includes('Awaiting user confirmation') && (
          <div className="mb-4">
            <Button
              onClick={handleManualSettlement}
              disabled={settling}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Handshake className="w-4 h-4 mr-2" />
              {settling ? 'Processing Settlement...' : 'Complete Deal & Settle'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Click to close the Hydra head and process the loan disbursement
            </p>
          </div>
        )}

        {/* Workflow Progress */}
        {workflowSteps.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Workflow Progress:</p>
            <div className="space-y-2">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getStatusColor(step.status)} text-white`}>
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.name}</p>
                    {step.details && (
                      <p className="text-xs text-muted-foreground">
                        {typeof step.details === 'string' ? step.details :
                         step.details.message || JSON.stringify(step.details)}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(step.status)} text-white border-0 text-xs`}>
                    {step.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Agent Conversation */}
      {conversation && conversation.messages.length > 0 && (
        <Card className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Agent Conversation
            </h3>
            <Badge variant="outline">
              {conversation.messages.length} messages
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conversation.messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg ${
                  message.agent === 'system'
                    ? 'bg-blue-500/10 border-l-4 border-blue-500'
                    : message.agent === 'lenny'
                    ? 'bg-green-500/10 border-l-4 border-green-500'
                    : message.agent === 'luna'
                    ? 'bg-purple-500/10 border-l-4 border-purple-500'
                    : 'bg-gray-500/10 border-l-4 border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase flex items-center gap-1">
                    {message.agent === 'lenny' && <Bot className="w-3 h-3" />}
                    {message.agent === 'masumi' && <Search className="w-3 h-3" />}
                    {message.agent === 'luna' && <Brain className="w-3 h-3" />}
                    {message.agent}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {message.type}
                  </Badge>
                </div>

                <p className="text-sm">{message.content}</p>

                {message.confidence && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">Confidence:</div>
                    <div className="flex-1 bg-white/10 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${message.confidence * 100}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium">
                      {(message.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                )}

                {message.reasoning && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {message.reasoning}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
