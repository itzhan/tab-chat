import { type SWRResponse } from 'swr';

import { useOnlyFetchOnceSWR } from '@/libs/swr';
import { globalService } from '@/services/global';
import { type StoreSetter } from '@/store/types';
import { type GlobalRuntimeConfig } from '@/types/serverConfig';

import { type ServerConfigStore } from './store';

const FETCH_SERVER_CONFIG_KEY = 'FETCH_SERVER_CONFIG';

type Setter = StoreSetter<ServerConfigStore>;
export const createServerConfigSlice = (
  set: Setter,
  get: () => ServerConfigStore,
  _api?: unknown,
) => new ServerConfigActionImpl(set, get, _api);

export class ServerConfigActionImpl {
  readonly #get: () => ServerConfigStore;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ServerConfigStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  useInitServerConfig = (): SWRResponse<GlobalRuntimeConfig> => {
    // SSR already computed getServerGlobalConfig() and embedded it as
    // window.__SERVER_CONFIG__, which the store provider seeded at mount time and
    // which also flips serverConfigInit to true. In that case we skip the trpc
    // round-trip entirely (it was a redundant 20s call on cold Lambda).
    const alreadyInit = this.#get().serverConfigInit;

    return useOnlyFetchOnceSWR<GlobalRuntimeConfig>(
      alreadyInit ? null : FETCH_SERVER_CONFIG_KEY,
      () => globalService.getGlobalConfig(),
      {
        onError: () => {
          this.#set({ serverConfigInit: true }, false, 'initServerConfigFallback');
        },
        onSuccess: (data) => {
          this.#set(
            {
              featureFlags: data.serverFeatureFlags,
              serverConfig: data.serverConfig,
              serverConfigInit: true,
            },
            false,
            'initServerConfig',
          );
        },
      },
    );
  };
}

export type ServerConfigAction = Pick<ServerConfigActionImpl, keyof ServerConfigActionImpl>;
