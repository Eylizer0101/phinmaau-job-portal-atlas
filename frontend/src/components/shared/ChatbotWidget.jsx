import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faPaperPlane,
  faRobot,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

const ROLE_QUESTIONS = {
  jobseeker: [
    'How do I apply for a job?',
    'How do I complete my profile?',
    'How do I track my application?',
    'How can I prepare for an interview?',
    'How can I increase my chances of getting hired?',
  ],
  employer: [
    'How do I post a job?',
    'How do I manage applicants?',
    'How do I add a hiring stage?',
    'How do I schedule an interview?',
    'How do I update my company profile?',
  ],
};

const INITIAL_MESSAGES = {
  jobseeker: {
    id: 'welcome-jobseeker',
    sender: 'assistant',
    text: "Hello! I'm Agap-AI. I can guide you through AGAPAY, answer career questions, and help with general questions using AI.",
  },
  employer: {
    id: 'welcome-employer',
    sender: 'assistant',
    text: "Hello! I'm Agap-AI. I can guide you through AGAPAY, answer hiring questions, and help with general questions using AI.",
  },
};

const makeMessageId = () =>
  `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const ChatbotWidget = ({ role = 'jobseeker' }) => {
  const location = useLocation();
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const normalizedRole = role === 'employer' ? 'employer' : 'jobseeker';
  const storageKey = `agapAiMessages:${normalizedRole}`;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({
    loaded: false,
    aiReady: false,
    knowledgeReady: false,
  });
  const [messages, setMessages] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(stored) && stored.length) return stored.slice(-30);
    } catch {
      // Ignore invalid saved chat data.
    }
    return [INITIAL_MESSAGES[normalizedRole]];
  });

  const suggestedQuestions = useMemo(
    () => ROLE_QUESTIONS[normalizedRole],
    [normalizedRole]
  );

  const isMessagesPage = location.pathname.toLowerCase().includes('/messages');

  useEffect(() => {
    let isMounted = true;

    api.get('/chatbot/status')
      .then((response) => {
        if (!isMounted) return;
        setServiceStatus({
          loaded: true,
          aiReady: Boolean(response?.data?.aiReady),
          knowledgeReady: Boolean(response?.data?.knowledgeReady),
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setServiceStatus({
          loaded: true,
          aiReady: false,
          knowledgeReady: false,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedRole]);

  const serviceStatusText = useMemo(() => {
    if (!serviceStatus.loaded) return 'Checking Agap-AI service...';
    if (serviceStatus.aiReady && serviceStatus.knowledgeReady) {
      return 'AI answers general questions and uses official AGAPAY knowledge when relevant.';
    }
    if (serviceStatus.aiReady) {
      return 'AI service is active for general questions.';
    }
    return 'Static AGAPAY guides are available while AI service is inactive.';
  }, [serviceStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {
      // The chatbot still works when browser storage is unavailable.
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [isOpen, isMinimized]);

  const clearConversation = () => {
    setMessages([INITIAL_MESSAGES[normalizedRole]]);
    setInput('');
  };

  const sendMessage = async (messageText) => {
    const cleanMessage = String(messageText || '').trim();
    if (!cleanMessage || isSending) return;

    const userMessage = {
      id: makeMessageId(),
      sender: 'user',
      text: cleanMessage,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const conversationHistory = nextMessages.slice(-8).map((message) => ({
        role: message.sender === 'assistant' ? 'assistant' : 'user',
        content: message.text,
      }));

      const response = await api.post('/chatbot/message', {
        message: cleanMessage,
        role: normalizedRole,
        history: conversationHistory,
      });

      const reply =
        response?.data?.reply ||
        'I could not find a guide for that question yet. Please try another question.';

      setMessages((current) => [
        ...current,
        {
          id: makeMessageId(),
          sender: 'assistant',
          text: reply,
          mode: response?.data?.mode || 'static',
        },
      ]);
    } catch (error) {
      const reply =
        error?.response?.data?.message ||
        'Agap-AI is temporarily unavailable. Please try again in a moment.';

      setMessages((current) => [
        ...current,
        {
          id: makeMessageId(),
          sender: 'assistant',
          text: reply,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const floatingBottomClass = isMessagesPage
    ? 'bottom-[112px] md:bottom-8'
    : 'bottom-[88px] md:bottom-6';

  return (
    <div
      className={`fixed right-3 sm:right-5 md:right-6 ${floatingBottomClass} z-[60]`}
      aria-live="polite"
    >
      {isOpen && !isMinimized && (
        <section
          className="mb-3 flex h-[min(560px,72vh)] w-[calc(100vw-24px)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]"
          aria-label="Agap-AI chatbot"
        >
          <header className="flex items-center justify-between bg-[#212C61] px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
                <FontAwesomeIcon icon={faRobot} className="text-lg" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold">Agap-AI</h2>
                <p className="truncate text-xs text-white/80">
                  Job portal assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Minimize Agap-AI"
              >
                <FontAwesomeIcon icon={faChevronDown} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close Agap-AI"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4">
            <div className="space-y-3">
              {messages.map((message) => {
                const isUser = message.sender === 'user';
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={[
                        'max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                        isUser
                          ? 'rounded-br-md bg-[#212C61] text-white'
                          : message.isError
                            ? 'rounded-bl-md border border-red-200 bg-red-50 text-red-700'
                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800',
                      ].join(' ')}
                    >
                      {message.text}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Agap-AI is typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 2 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      disabled={isSending}
                      className="rounded-full border border-[#212C61]/20 bg-white px-3 py-2 text-left text-xs font-medium text-[#212C61] transition hover:border-[#212C61]/50 hover:bg-[#212C61]/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <label htmlFor={`agap-ai-input-${normalizedRole}`} className="sr-only">
                Ask Agap-AI a question
              </label>
              <textarea
                ref={inputRef}
                id={`agap-ai-input-${normalizedRole}`}
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 1000))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                rows={1}
                placeholder="Ask Agap-AI anything..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#212C61] focus:outline-none focus:ring-2 focus:ring-[#212C61]/20"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#212C61] text-white transition hover:bg-[#18214d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <FontAwesomeIcon icon={isSending ? faSpinner : faPaperPlane} spin={isSending} />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 px-1">
              <p className="text-[11px] text-slate-400">
                {serviceStatusText}
              </p>
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="flex-shrink-0 text-[11px] font-semibold text-slate-500 hover:text-[#212C61]"
                >
                  Clear chat
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className="ml-auto flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-[#212C61]/30 hover:text-[#212C61] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61] focus-visible:ring-offset-2"
        aria-label={isOpen && isMinimized ? 'Restore Agap-AI' : 'Open Agap-AI'}
        aria-expanded={isOpen && !isMinimized}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#212C61]/10 text-[#212C61]">
          <FontAwesomeIcon icon={faRobot} />
        </span>
        <span>Agap-AI</span>
      </button>
    </div>
  );
};

export default ChatbotWidget;
