'use client';

import { Flexbox } from '@lobehub/ui';
import { memo } from 'react';

import { useAiInfraStore } from '@/store/aiInfra';
import { useServerConfigStore } from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import ModelList from '../../features/ModelList';
import { type ProviderConfigProps } from '../../features/ProviderConfig';
import ProviderConfig from '../../features/ProviderConfig';

interface ProviderDetailProps extends ProviderConfigProps {
  showConfig?: boolean;
}
const ProviderDetail = memo<ProviderDetailProps>(({ showConfig = true, ...card }) => {
  const useFetchAiProviderItem = useAiInfraStore((s) => s.useFetchAiProviderItem);
  const useFetchAiProviderList = useAiInfraStore((s) => s.useFetchAiProviderList);
  const isMobile = useServerConfigStore((s) => s.isMobile);
  const isAdmin = useUserStore(userProfileSelectors.isAdmin);

  useFetchAiProviderList({ enabled: isMobile });
  useFetchAiProviderItem(card.id);

  return (
    <Flexbox gap={24} paddingBlock={8}>
      {showConfig && <ProviderConfig {...card} />}
      <ModelList id={card.id} {...card.settings} readOnly={!isAdmin} />
    </Flexbox>
  );
});

export default ProviderDetail;
