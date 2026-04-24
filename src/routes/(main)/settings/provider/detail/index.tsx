import { Flexbox } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { useEffect, useMemo } from 'react';

import Loading from '@/components/Loading/BrandTextLoading';
import dynamic from '@/libs/next/dynamic';
import { aiProviderSelectors, useAiInfraStore } from '@/store/aiInfra';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

const NewAPI = dynamic(() => import('./newapi'), {
  loading: () => <Loading debugId="Provider > NewAPI" />,
  ssr: false,
});
const OpenAI = dynamic(() => import('./openai'), {
  loading: () => <Loading debugId="Provider > OpenAI" />,
  ssr: false,
});
const VertexAI = dynamic(() => import('./vertexai'), {
  loading: () => <Loading debugId="Provider > VertexAI" />,
  ssr: false,
});
const GitHub = dynamic(() => import('./github'), {
  loading: () => <Loading debugId="Provider > GitHub" />,
  ssr: false,
});
const Ollama = dynamic(() => import('./ollama'), {
  loading: () => <Loading debugId="Provider > Ollama" />,
  ssr: false,
});
const ComfyUI = dynamic(() => import('./comfyui'), {
  loading: () => <Loading debugId="Provider > ComfyUI" />,
  ssr: false,
});
const Cloudflare = dynamic(() => import('./cloudflare'), {
  loading: () => <Loading debugId="Provider > Cloudflare" />,
  ssr: false,
});
const Bedrock = dynamic(() => import('./bedrock'), {
  loading: () => <Loading debugId="Provider > Bedrock" />,
  ssr: false,
});
const AzureAI = dynamic(() => import('./azureai'), {
  loading: () => <Loading debugId="Provider > AzureAI" />,
  ssr: false,
});
const Azure = dynamic(() => import('./azure'), {
  loading: () => <Loading debugId="Provider > Azure" />,
  ssr: false,
});
const ProviderGrid = dynamic(() => import('../(list)/ProviderGrid'), {
  loading: () => <Loading debugId="Provider > Grid" />,
  ssr: false,
});
const DefaultPage = dynamic(() => import('./default/ProviderDetialPage'), {
  loading: () => <Loading debugId="Provider > Default" />,
  ssr: false,
});

type ProviderDetailPageProps = {
  id?: string | null;
  onProviderSelect: (provider: string) => void;
};

const ProviderDetailPage = (props: ProviderDetailPageProps) => {
  const { id, onProviderSelect } = props;
  const isAdmin = useUserStore(userProfileSelectors.isAdmin);

  // Non-admins shouldn't land on the "All providers" grid — there's nothing
  // actionable for them there. Resolve to the first BYO-enabled provider and
  // navigate to it; if none exists, render a guidance empty state.
  const enabledProviders = useAiInfraStore(aiProviderSelectors.enabledAiProviderList, isEqual);
  const runtimeConfig = useAiInfraStore((s) => s.aiProviderRuntimeConfig);
  const firstByoProviderId = useMemo(() => {
    if (isAdmin) return null;
    const first = enabledProviders.find((p) => !!runtimeConfig?.[p.id]?.settings?.allowUserApiKey);
    return first?.id ?? null;
  }, [isAdmin, enabledProviders, runtimeConfig]);

  useEffect(() => {
    if (isAdmin) return;
    if ((id === 'all' || !id) && firstByoProviderId) {
      onProviderSelect(firstByoProviderId);
    }
  }, [isAdmin, id, firstByoProviderId, onProviderSelect]);

  if (!isAdmin && (id === 'all' || !id) && !firstByoProviderId) {
    return (
      <Flexbox
        align="center"
        justify="center"
        padding={48}
        style={{
          color: '#888',
          fontSize: 14,
          lineHeight: 1.8,
          minHeight: 240,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>暂无可配置的 AI 服务商</div>
        <div>管理员尚未开放任何服务商让用户自定义 API Key。</div>
        <div>请联系管理员在服务商设置里打开&ldquo;允许用户使用自己的 API Key&rdquo;。</div>
      </Flexbox>
    );
  }

  switch (id) {
    case 'all': {
      return <ProviderGrid onProviderSelect={onProviderSelect} />;
    }
    case 'azure': {
      return <Azure />;
    }
    case 'azureai': {
      return <AzureAI />;
    }
    case 'bedrock': {
      return <Bedrock />;
    }
    case 'cloudflare': {
      return <Cloudflare />;
    }
    case 'comfyui': {
      return <ComfyUI />;
    }
    case 'github': {
      return <GitHub />;
    }
    case 'ollama': {
      return <Ollama />;
    }
    case 'newapi': {
      return <NewAPI />;
    }
    case 'openai': {
      return <OpenAI />;
    }
    case 'vertexai': {
      return <VertexAI />;
    }
    default: {
      return <DefaultPage id={id} />;
    }
  }
};

export default ProviderDetailPage;
