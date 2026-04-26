'use client';

import { type ReactNode } from 'react';
import { memo, useCallback } from 'react';

import { useFetchAgentDocuments } from '@/hooks/useFetchAgentDocuments';
import { useFetchNotebookDocuments } from '@/hooks/useFetchNotebookDocuments';
import { useChatStore } from '@/store/chat';

import WideScreenContainer from '../../WideScreenContainer';
import SkeletonList from '../components/SkeletonList';
import MessageItem from '../Messages';
import { MessageActionProvider } from '../Messages/Contexts/MessageActionProvider';
import { dataSelectors, useConversationStore } from '../store';
import VirtualizedList from './components/VirtualizedList';

export interface ChatListProps {
  /**
   * Disable the actions bar for all messages (e.g., in share page)
   */
  disableActionsBar?: boolean;
  /**
   * Custom item renderer. If not provided, uses default ChatItem.
   */
  itemContent?: (index: number, id: string) => ReactNode;
  /**
   * Force showing welcome component even when messages exist
   */
  showWelcome?: boolean;
  /**
   * Welcome component to display when there are no messages
   */
  welcome?: ReactNode;
}
/**
 * ChatList component for Conversation
 *
 * Uses ConversationStore for message data and fetching.
 */
const ChatList = memo<ChatListProps>(({ disableActionsBar, welcome, itemContent, showWelcome }) => {
  // Fetch messages (SWR key is null when skipFetch is true)
  const context = useConversationStore((s) => s.context);
  const [skipFetch, useFetchMessages] = useConversationStore((s) => [
    dataSelectors.skipFetch(s),
    s.useFetchMessages,
  ]);
  const activeAgentId = useChatStore((s) => s.activeAgentId);
  useFetchMessages(context, skipFetch);

  // Skip fetching notebook for share pages (they require authentication)
  const isSharePage = !!context.topicShareId;

  // Fetch notebook documents when topic is selected (skip for share pages)
  useFetchAgentDocuments(isSharePage ? undefined : activeAgentId);
  useFetchNotebookDocuments(isSharePage ? undefined : context.topicId!);

  // Use selectors for data

  const displayMessageIds = useConversationStore(dataSelectors.displayMessageIds);

  const defaultItemContent = useCallback(
    (index: number, id: string) => {
      const isLatestItem = displayMessageIds.length === index + 1;
      return <MessageItem id={id} index={index} isLatestItem={isLatestItem} />;
    },
    [displayMessageIds.length],
  );
  const messagesInit = useConversationStore(dataSelectors.messagesInit);

  // When topicId is null (new conversation), show welcome directly without waiting for fetch
  // because there's no server data to fetch - only local optimistic updates exist
  const isNewConversation = !context.topicId;

  if (!messagesInit && !isNewConversation) {
    return <SkeletonList />;
  }

  if ((showWelcome || displayMessageIds.length === 0) && welcome) {
    return (
      <WideScreenContainer
        style={{
          height: '100%',
        }}
        wrapperStyle={{
          minHeight: '100%',
          overflowY: 'auto',
        }}
      >
        {welcome}
      </WideScreenContainer>
    );
  }

  return (
    <MessageActionProvider withSingletonActionsBar={!disableActionsBar}>
      <VirtualizedList
        dataSource={displayMessageIds}
        itemContent={itemContent ?? defaultItemContent}
      />
    </MessageActionProvider>
  );
});

ChatList.displayName = 'ConversationChatList';

export default ChatList;
