import debug from 'debug';

import { AiProviderModel } from '@/database/models/aiProvider';
import { type LobeChatDatabase } from '@/database/type';
import { getPrimaryAdminUserId } from '@/server/modules/Admin/getPrimaryAdminUserId';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

const log = debug('lobe:quota-byo');

/**
 * Whether this (user, provider) call was served by the user's own API key
 * under the admin's BYO toggle. When true, callers should skip platform
 * quota deduction — the cost was already paid to the upstream via the user's
 * own key.
 *
 * Mirrors the detection in `initModelRuntimeFromDB`: admin enabled
 * `allowUserApiKey`, caller isn't the admin, and caller has a non-empty
 * apiKey on their own provider row.
 *
 * IMPORTANT: user `keyVaults` is stored AES-encrypted. We must pass
 * `KeyVaultsGateKeeper.getUserKeyVaults` as the decryptor — the default is
 * `JSON.parse`, which throws on ciphertext and silently leaves `keyVaults`
 * as `{}`, making BYO detection always fail.
 */
export const isCallerUsingOwnApiKey = async (
  db: LobeChatDatabase,
  userId: string,
  provider: string,
): Promise<boolean> => {
  try {
    const adminId = await getPrimaryAdminUserId(db);
    if (!adminId || adminId === userId) {
      log('admin missing or caller is admin (userId=%s)', userId);
      return false;
    }

    const adminModel = new AiProviderModel(db, adminId);
    const adminConfig = await adminModel.getAiProviderById(provider);
    if (!adminConfig?.settings?.allowUserApiKey) {
      log('allowUserApiKey off for provider=%s', provider);
      return false;
    }

    const userModel = new AiProviderModel(db, userId);
    const userConfig = await userModel.getAiProviderById(
      provider,
      KeyVaultsGateKeeper.getUserKeyVaults,
    );
    const userApiKey = (userConfig?.keyVaults as any)?.apiKey as string | undefined;
    const hasKey = !!userApiKey && userApiKey.trim() !== '';
    log('provider=%s userId=%s hasOwnKey=%s', provider, userId, hasKey);
    return hasKey;
  } catch (err) {
    log('detection error: %s', (err as Error).message);
    return false;
  }
};
