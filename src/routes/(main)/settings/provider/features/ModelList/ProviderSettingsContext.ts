import { createContext } from 'react';

export interface ProviderSettingsContextValue {
  modelEditable?: boolean;
  /**
   * When true, the list renders purely as a viewer — enable/disable switches,
   * edit and delete actions, add-new-model and fetch-models buttons are all
   * suppressed. Used for non-admin users on a BYO provider.
   */
  readOnly?: boolean;
  sdkType?: string;
  showAddNewModel?: boolean;
  showDeployName?: boolean;
  showModelFetcher?: boolean;
}

export const ProviderSettingsContext = createContext<ProviderSettingsContextValue>({});
