import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  Bot,
  User as UserIcon,
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle,
  FileText,
  Calendar,
  CreditCard,
  Pill
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function MedicalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !conversation) {
      initializeConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'assistant_medical',
        metadata: {
          name: 'Conversation Assistant Médical',
          description: 'Assistance IA pour tâches médicales'
        }
      });

      setConversation(conv);
      
      // Message de bienvenue
      setMessages([{
        role: 'assistant',
        content: "👋 Bonjour Docteur ! Je suis votre assistant médical AI.\n\nJe peux vous aider avec :\n- 📋 Gestion des patients (création, recherche, mise à jour)\n- 🩺 Consultations et notes médicales\n- 📅 Agenda et rendez-vous\n- 📄 Génération de documents (certificats, demandes d'examens, lettres)\n- 💊 Prescriptions\n- 💳 Facturation et codes INAMI\n- 📊 Statistiques du cabinet\n- 📥 Import de dossiers médicaux\n\n**Comment puis-je vous aider aujourd'hui ?**",
        timestamp: new Date().toISOString()
      }]);

      // S'abonner aux mises à jour
      const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
        setIsTyping(data.messages?.some(m => m.role === 'assistant' && !m.content));
      });

      return () => unsubscribe();

    } catch (error) {
      console.error('Erreur initialisation conversation:', error);
      toast.error('Impossible d\'initialiser l\'assistant');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversation || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setIsTyping(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });

    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      setIsTyping(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getActionIcon = (toolCall) => {
    const name = toolCall?.name?.toLowerCase() || '';
    
    if (name.includes('patient')) return <UserIcon className="w-4 h-4" />;
    if (name.includes('consultation')) return <FileText className="w-4 h-4" />;
    if (name.includes('rendezvous') || name.includes('calendar')) return <Calendar className="w-4 h-4" />;
    if (name.includes('invoice') || name.includes('factur')) return <CreditCard className="w-4 h-4" />;
    if (name.includes('prescription') || name.includes('medication')) return <Pill className="w-4 h-4" />;
    
    return <Zap className="w-4 h-4" />;
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    return (
      <div key={index} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-blue-600'
        }`}>
          {isUser ? (
            <UserIcon className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Message content */}
        <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
          <div className={`max-w-[80%] ${
            isUser 
              ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm'
          } px-4 py-3 shadow-sm`}>
            {isAssistant ? (
              <ReactMarkdown 
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="text-slate-700 leading-relaxed my-2">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  ul: ({ children }) => <ul className="my-2 ml-4 space-y-1">{children}</ul>,
                  li: ({ children }) => <li className="text-slate-700">{children}</li>,
                  code: ({ inline, children }) => inline ? (
                    <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-900 text-slate-100 p-2 rounded text-xs font-mono my-2">
                      {children}
                    </code>
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}

            {/* Tool calls (actions effectuées) */}
            {message.tool_calls?.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.tool_calls.map((toolCall, idx) => {
                  const isComplete = toolCall.status === 'completed' || toolCall.status === 'success';
                  const isError = toolCall.status === 'error' || toolCall.status === 'failed';
                  const isRunning = toolCall.status === 'running' || toolCall.status === 'in_progress';

                  return (
                    <div key={idx} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                      isComplete ? 'bg-green-50 text-green-800 border border-green-200' :
                      isError ? 'bg-red-50 text-red-800 border border-red-200' :
                      'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      {isRunning ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isComplete ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : isError ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        getActionIcon(toolCall)
                      )}
                      <span className="font-medium">
                        {toolCall.name?.split('.').pop() || 'Action'}
                      </span>
                      {toolCall.status && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {toolCall.status}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-slate-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp && new Date(message.timestamp).toLocaleTimeString('fr-BE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    );
  };

  // Bouton flottant
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 z-50"
        size="icon"
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-white" />
          <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
        </div>
      </Button>
    );
  }

  // Chat window
  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-2xl transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-[450px] h-[600px]'
    } flex flex-col`}>
      {/* Header */}
      <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistant Médical AI</CardTitle>
              {!isMinimized && (
                <p className="text-xs text-purple-100 mt-0.5">
                  {isTyping ? 'En train d\'écrire...' : 'En ligne • Prêt à vous aider'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            )}

            {messages.map((message, index) => renderMessage(message, index))}

            {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input */}
          <div className="border-t p-4 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Demandez-moi quelque chose..."
                disabled={isSending || isTyping}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isSending || isTyping}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 Essayez: "Crée un nouveau patient", "Trouve les consultations d'aujourd'hui", "Génère un certificat"
            </p>
          </div>
        </>
      )}
    </Card>
  );
}