/**
 * Translate raw quota error messages from QuotaGuard into friendly Chinese strings.
 * Quota errors come as `QUOTA_EXCEEDED:<reason>` from the server. Storage quota
 * errors come as `STORAGE_QUOTA_EXCEEDED:<quota>:<used>`.
 */
export const translateQuotaError = (raw: string | undefined): string | undefined => {
  if (!raw) return raw;

  if (raw.startsWith('QUOTA_EXCEEDED:')) {
    const reason = raw.slice('QUOTA_EXCEEDED:'.length);
    switch (reason) {
      case 'plan_exceeded': {
        return '该模型本月可用次数已用完。请升级套餐或联系管理员获取加油包。';
      }
      case 'no_quota': {
        return '当前套餐未配置该模型的使用权限。请联系管理员开通或切换模型。';
      }
      case 'no_plan': {
        return '你还未绑定任何订阅套餐，请联系管理员分配。';
      }
      default: {
        return '该模型用量已达到限制。请升级套餐或购买加油包。';
      }
    }
  }

  if (raw.startsWith('STORAGE_QUOTA_EXCEEDED:')) {
    const [, quotaStr, usedStr] = raw.split(':');
    const quota = Number(quotaStr);
    const used = Number(usedStr);
    const fmt = (b: number) => `${(b / 1024 / 1024).toFixed(0)} MB`;
    return `知识库空间已满（${fmt(used)} / ${fmt(quota)}）。请删除部分文件，或联系管理员升级套餐。`;
  }

  return raw;
};
