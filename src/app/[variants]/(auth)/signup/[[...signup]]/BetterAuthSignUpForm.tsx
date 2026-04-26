'use client';

import { Button, Flexbox, Icon, Text } from '@lobehub/ui';
import { Divider, Form, Input } from 'antd';
import { Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { message } from '@/components/AntdStaticMethods';
import AuthIcons from '@/components/AuthIcons';
import { signIn } from '@/libs/better-auth/auth-client';
import { isBuiltinProvider, normalizeProviderId } from '@/libs/better-auth/utils/client';

import { AuthCard } from '../../../../../features/AuthCard';
import { useAuthServerConfigStore } from '../../_layout/AuthServerConfigProvider';
import { type SignUpFormValues } from './useSignUp';
import { useSignUp } from './useSignUp';

const BetterAuthSignUpForm = () => {
  const [form] = Form.useForm<SignUpFormValues>();
  const { loading, onSubmit, businessElement } = useSignUp();
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const { t } = useTranslation('auth');
  const searchParams = useSearchParams();
  const oAuthSSOProviders = useAuthServerConfigStore((s) => s.serverConfig.oAuthSSOProviders) || [];
  const disableEmailPassword = useAuthServerConfigStore(
    (s) => s.serverConfig.disableEmailPassword || false,
  );

  useEffect(() => {
    const email = searchParams.get('email');
    if (email) form.setFieldsValue({ email });
  }, [searchParams, form]);

  const handleSocialSignIn = async (provider: string) => {
    setSocialLoading(provider);
    const normalizedProvider = normalizeProviderId(provider);
    try {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      const result = isBuiltinProvider(normalizedProvider)
        ? await signIn.social({ callbackURL: callbackUrl, provider: normalizedProvider })
        : await signIn.oauth2({ callbackURL: callbackUrl, providerId: normalizedProvider });
      if (result && 'error' in result && result.error) throw result.error;
    } catch (error) {
      console.error(`${normalizedProvider} sign in error:`, error);
      message.error(t('betterAuth.signin.socialError'));
    } finally {
      setSocialLoading(null);
    }
  };

  const getProviderLabel = (provider: string) => {
    const normalized = provider
      .toLowerCase()
      .replaceAll(/(^|[_-])([a-z])/g, (_, __, c) => c.toUpperCase());
    const normalizedKey = normalized.replaceAll(/[^\da-z]/gi, '');
    const key = `betterAuth.signin.continueWith${normalizedKey}`;
    return t(key, { defaultValue: `Continue with ${normalized}` });
  };

  const footer = (
    <Flexbox horizontal align={'center'} gap={6} justify={'center'}>
      <Text fontSize={13} type={'secondary'}>
        {t('betterAuth.signup.hasAccount')}
      </Text>
      <Link href={`/signin${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}>
        <Text fontSize={13} style={{ textDecoration: 'underline' }}>
          {t('betterAuth.signup.signinLink')}
        </Text>
      </Link>
    </Flexbox>
  );

  return (
    <AuthCard footer={footer} title={t('betterAuth.signup.title')}>
      {oAuthSSOProviders.length > 0 && (
        <Flexbox gap={12}>
          {oAuthSSOProviders.map((provider) => (
            <Button
              block
              key={provider}
              loading={socialLoading === provider}
              size="large"
              icon={
                <Icon
                  icon={AuthIcons(provider, 18)}
                  style={{ left: 12, position: 'absolute', top: 13 }}
                />
              }
              onClick={() => handleSocialSignIn(provider)}
            >
              {getProviderLabel(provider)}
            </Button>
          ))}
          {!disableEmailPassword && (
            <Divider>
              <Text fontSize={12} type={'secondary'}>
                {t('betterAuth.signin.orContinueWith')}
              </Text>
            </Divider>
          )}
        </Flexbox>
      )}
      {!disableEmailPassword && (
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item
            name="email"
            rules={[
              { message: t('betterAuth.errors.emailRequired'), required: true },
              { message: t('betterAuth.errors.emailInvalid'), type: 'email' },
            ]}
          >
            <Input
              placeholder={t('betterAuth.signup.emailPlaceholder')}
              size="large"
              prefix={
                <Icon
                  icon={Mail}
                  style={{
                    marginInline: 6,
                  }}
                />
              }
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { message: t('betterAuth.errors.passwordRequired'), required: true },
              { message: t('betterAuth.errors.passwordMinLength'), min: 8 },
              { max: 64, message: t('betterAuth.errors.passwordMaxLength') },
              {
                message: t('betterAuth.errors.passwordFormat'),
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const hasLetter = /[a-z]/i.test(value);
                  const hasNumber = /\d/.test(value);
                  return hasLetter && hasNumber ? Promise.resolve() : Promise.reject();
                },
              },
            ]}
          >
            <Input.Password
              placeholder={t('betterAuth.signup.passwordPlaceholder')}
              size="large"
              prefix={
                <Icon
                  icon={Lock}
                  style={{
                    marginInline: 6,
                  }}
                />
              }
            />
          </Form.Item>
          <Form.Item
            dependencies={['password']}
            name="confirmPassword"
            rules={[
              { message: t('betterAuth.errors.confirmPasswordRequired'), required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('betterAuth.errors.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder={t('betterAuth.signup.confirmPasswordPlaceholder')}
              size="large"
              prefix={
                <Icon
                  icon={Lock}
                  style={{
                    marginInline: 6,
                  }}
                />
              }
            />
          </Form.Item>

          {businessElement}

          <Form.Item>
            <Button block htmlType="submit" loading={loading} size="large" type="primary">
              {t('betterAuth.signup.submit')}
            </Button>
          </Form.Item>
        </Form>
      )}
    </AuthCard>
  );
};

export default BetterAuthSignUpForm;
