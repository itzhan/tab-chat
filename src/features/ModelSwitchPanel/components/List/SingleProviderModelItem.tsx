import { memo } from 'react';

import { ModelItemRender } from '@/components/ModelSelect';

import { type ModelWithProviders } from '../../types';
import ModelQuotaBadge from '../ModelQuotaBadge';

interface SingleProviderModelItemProps {
  data: ModelWithProviders;
  newLabel: string;
  proBadgeLabel?: string;
  showInfoTag?: boolean;
}

export const SingleProviderModelItem = memo<SingleProviderModelItemProps>(
  ({ data, newLabel, proBadgeLabel, showInfoTag }) => {
    const provider = data.providers[0];
    return (
      <>
        <ModelItemRender
          {...data.model}
          {...data.model.abilities}
          newBadgeLabel={newLabel}
          proBadgeLabel={proBadgeLabel}
          showInfoTag={showInfoTag}
        />
        {provider && <ModelQuotaBadge modelId={data.model.id} providerId={provider.id} />}
      </>
    );
  },
);

SingleProviderModelItem.displayName = 'SingleProviderModelItem';
