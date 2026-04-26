import { BRANDING_NAME } from '@lobechat/business-const';
import { Block, Button, Flexbox, Tag } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProductLogo } from '@/components/Branding';
import { CHANGELOG_URL, MANUAL_UPGRADE_URL, OFFICIAL_SITE } from '@/const/url';
import { CURRENT_VERSION, isDesktop } from '@/const/version';
import { useNewVersion } from '@/features/User/UserPanel/useNewVersion';
import { useGlobalStore } from '@/store/global';

import { APP_VERSION } from './appVersion';

const styles = createStaticStyles(({ css, cssVar }) => ({
  logo: css`
    border-radius: calc(${cssVar.borderRadiusLG} * 2);
  `,
}));

interface UpdaterState {
  errorMessage?: string;
  progress?: {
    percent: number;
  };
  stage: 'checking' | 'downloaded' | 'downloading' | 'error' | 'idle' | 'latest';
}

const Version = memo<{ mobile?: boolean }>(({ mobile }) => {
  const hasNewVersion = useNewVersion();
  const [latestVersion, serverVersion, useCheckServerVersion] = useGlobalStore((s) => [
    s.latestVersion,
    s.serverVersion,
    s.useCheckServerVersion,
  ]);
  const { t } = useTranslation(['common', 'setting']);

  useCheckServerVersion();

  const showServerVersion = serverVersion && serverVersion !== CURRENT_VERSION;

  const [updaterState, setUpdaterState] = useState<UpdaterState>({ stage: 'idle' });
  const [buildChannel, setBuildChannel] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    import('@/services/electron/autoUpdate')
      .then(({ autoUpdateService }) => autoUpdateService.getUpdaterState())
      .then(setUpdaterState)
      .catch((error) => {
        console.error('Failed to get updater state:', error);
      });
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
    import('@/services/electron/autoUpdate')
      .then(({ autoUpdateService }) => autoUpdateService.getBuildChannel())
      .then(setBuildChannel)
      .catch((error) => {
        console.error('Failed to get build channel:', error);
      });
  }, [isDesktop]);

  const renderUpdateButton = () => {
    if (!isDesktop) {
      if (hasNewVersion) {
        return (
          <a href={MANUAL_UPGRADE_URL} rel="noreferrer" style={{ flex: 1 }} target="_blank">
            <Button block={mobile} type={'primary'}>
              {t('upgradeVersion.action')}
            </Button>
          </a>
        );
      }
      return null;
    }

    const { stage, progress } = updaterState;

    switch (stage) {
      case 'checking': {
        return (
          <Button loading block={mobile}>
            {t('checkForUpdates')}
          </Button>
        );
      }
      case 'downloading': {
        const percent = progress ? Math.round(progress.percent) : 0;
        return (
          <Button loading block={mobile}>
            {t('downloadingUpdate', { percent })}
          </Button>
        );
      }
      case 'downloaded': {
        return (
          <Button
            block={mobile}
            type="primary"
            onClick={() => {
              void import('@/services/electron/autoUpdate')
                .then(({ autoUpdateService }) => autoUpdateService.installNow())
                .catch((error) => {
                  console.error('Failed to install update:', error);
                });
            }}
          >
            {t('restartToUpdate')}
          </Button>
        );
      }
      case 'latest': {
        return (
          <Button disabled block={mobile}>
            {t('alreadyUpToDate')}
          </Button>
        );
      }
      default: {
        return (
          <Button
            block={mobile}
            onClick={() => {
              void import('@/services/electron/autoUpdate')
                .then(({ autoUpdateService }) => autoUpdateService.checkUpdate())
                .then(() =>
                  import('@/services/electron/autoUpdate').then(({ autoUpdateService }) =>
                    autoUpdateService.getUpdaterState(),
                  ),
                )
                .then(setUpdaterState)
                .catch((error) => {
                  console.error('Failed to check update:', error);
                });
            }}
          >
            {t('checkForUpdates')}
          </Button>
        );
      }
    }
  };

  return (
    <Flexbox
      align={mobile ? 'stretch' : 'center'}
      gap={16}
      horizontal={!mobile}
      justify={'space-between'}
      width={'100%'}
    >
      <Flexbox horizontal align={'center'} flex={'none'} gap={16}>
        <a href={OFFICIAL_SITE} rel="noreferrer" target="_blank">
          <Block
            clickable
            align={'center'}
            className={styles.logo}
            height={64}
            justify={'center'}
            width={64}
          >
            <ProductLogo size={52} />
          </Block>
        </a>
        <Flexbox align={'flex-start'} gap={6}>
          <div style={{ fontSize: 18, fontWeight: 'bolder' }}>{BRANDING_NAME}</div>
          <Flexbox gap={6} horizontal={!mobile}>
            <Tag>v{APP_VERSION}</Tag>

            {buildChannel && buildChannel !== 'stable' && (
              <Tag color={'gold'}>
                {t(`setting:tab.advanced.updateChannel.${buildChannel}`, {
                  defaultValue: buildChannel.charAt(0).toUpperCase() + buildChannel.slice(1),
                })}
              </Tag>
            )}
            {showServerVersion && (
              <Tag>{t('upgradeVersion.serverVersion', { version: `v${serverVersion}` })}</Tag>
            )}
            {hasNewVersion && (
              <Tag color={'info'}>
                {t('upgradeVersion.newVersion', { version: `v${latestVersion}` })}
              </Tag>
            )}
          </Flexbox>
        </Flexbox>
      </Flexbox>
      <Flexbox horizontal flex={mobile ? 1 : undefined} gap={8}>
        <a href={CHANGELOG_URL} rel="noreferrer" style={{ flex: 1 }} target="_blank">
          <Button block={mobile}>{t('changelog')}</Button>
        </a>
        {renderUpdateButton()}
      </Flexbox>
    </Flexbox>
  );
});

export default Version;
