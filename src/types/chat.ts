export type ChatConversationStatus = 'bot' | 'human' | 'closed';

export type ChatMessageSender = 'user' | 'bot' | 'admin' | 'system';

export type ChatConversation = {
  id: string;
  accessToken: string;
  userId: string | null;
  guestToken: string | null;
  displayName: string;
  status: ChatConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  telegramNotifiedAt?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: ChatMessageSender;
  body: string;
  createdAt: string;
};

export type ChatConversationWithMessages = ChatConversation & {
  messages: ChatMessage[];
};
