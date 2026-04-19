'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useDiscoverStore } from '@/store/discover';
import { AssistantSorts } from '@/types/discover';

import Title from '../../components/Title';
import AssistantList from '../agent/features/List';
import Loading from './loading';

const HomePage = memo(() => {
  const { t } = useTranslation('discover');
  const useAssistantList = useDiscoverStore((s) => s.useAssistantList);

  const { data: assistantList, isLoading: assistantLoading } = useAssistantList({
    page: 1,
    pageSize: 24,
    sort: AssistantSorts.Recommended,
  });

  if (assistantLoading || !assistantList) return <Loading />;

  return (
    <>
      <Title more={t('home.more')} moreLink={'/community/agent'}>
        {t('home.featuredAssistants')}
      </Title>
      <AssistantList data={assistantList.items} rows={4} />
    </>
  );
});

export default HomePage;
