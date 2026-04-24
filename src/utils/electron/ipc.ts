import { getElectronIpc } from '@lobechat/electron-client-ipc';

type DesktopIpcServices = any;

export const ensureElectronIpc = (): DesktopIpcServices => {
  const ipc = getElectronIpc();
  if (!ipc) {
    throw new Error(
      'electronAPI.invoke not found. Ensure the preload exposes invoke via window.electronAPI.invoke',
    );
  }
  return ipc;
};
