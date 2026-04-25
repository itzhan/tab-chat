import { memo, useMemo } from 'react';

import { aiProviderSelectors, useAiInfraStore } from '@/store/aiInfra';
import { useImageStore } from '@/store/image';
import { imageGenerationConfigSelectors } from '@/store/image/selectors';
import { useGenerationConfigParam } from '@/store/image/slices/generationConfig/hooks';

import Select from './Select';

const SizeSelect = memo(() => {
  const { value, setValue, enumValues } = useGenerationConfigParam('size');
  // Providers in paramless mode (e.g. sub2api gpt-image-2) accept any size
  // *or* `auto` to let the upstream pick. Inject `auto` if the model spec
  // didn't already include it so the user can opt out of forcing a size.
  const provider = useImageStore(imageGenerationConfigSelectors.provider);
  const isParamless = useAiInfraStore(
    aiProviderSelectors.isProviderParamlessImageMode(provider ?? undefined),
  );

  const options = useMemo(() => {
    const sizes = enumValues ?? [];
    const merged = isParamless && !sizes.includes('auto') ? ['auto', ...sizes] : sizes;
    return merged.map((size) => ({ label: size, value: size }));
  }, [enumValues, isParamless]);

  return <Select options={options} value={value} onChange={setValue} />;
});

export default SizeSelect;
