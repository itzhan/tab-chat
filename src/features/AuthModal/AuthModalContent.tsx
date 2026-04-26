'use client';

import { Button, Flexbox, Icon, Skeleton, Text } from '@lobehub/ui';
import { useModalContext } from '@lobehub/ui/base-ui';
import { Divider, Form, Input } from 'antd';
import { ChevronRight, Lock, Mail } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';

import { message } from '@/components/AntdStaticMethods';
import AuthIcons from '@/components/AuthIcons';
import { authClient, signIn, signUp } from '@/libs/better-auth/auth-client';
import { isBuiltinProvider, normalizeProviderId } from '@/libs/better-auth/utils/client';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';

const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

type Mode = 'signin' | 'signup';

interface AuthModalContentProps {
  callbackUrl?: string;
  initialMode?: Mode;
}

interface SignInFormValues {
  email: string;
  password: string;
}

interface SignUpFormValues extends SignInFormValues {
  confirmPassword: string;
}

const AuthModalContent = memo<AuthModalContentProps>(({ initialMode = 'signin', callbackUrl }) => {
  const { t } = useTranslation('auth');
  const { close } = useModalContext();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [signInForm] = Form.useForm<SignInFormValues>();
  const [signUpForm] = Form.useForm<SignUpFormValues>();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const oAuthSSOProviders = useServerConfigStore(serverConfigSelectors.oAuthSSOProviders) || [];
  const disableEmailPassword = useServerConfigStore(serverConfigSelectors.disableEmailPassword);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, [mode]);

  const finalCallbackUrl =
    callbackUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');

  const onAuthSuccess = () => {
    close();
    // Force better-auth's nanostore to re-fetch the session under the cookie that
    // signin/signup just set. Without this notify, useSession keeps returning its
    // cached anonymous result, isSignedIn never flips → useInitUserState's SWR key
    // stays null → isUserStateInit stays false → MarketAuthProvider sticks at
    // 'loading' forever, leaving any auth-gated page stuck on a spinner.
    authClient.$store.notify('$sessionSignal');
    // Revalidate any SWR cache populated while anonymous so it re-fetches under
    // the new session.
    void mutate(() => true, undefined, { revalidate: true });
  };

  const handleSocialSignIn = async (provider: string) => {
    setSocialLoading(provider);
    const normalizedProvider = normalizeProviderId(provider);
    try {
      const result = isBuiltinProvider(normalizedProvider)
        ? await signIn.social({ callbackURL: finalCallbackUrl, provider: normalizedProvider })
        : await signIn.oauth2({ callbackURL: finalCallbackUrl, providerId: normalizedProvider });
      if (result && 'error' in result && result.error) throw result.error;
      // Social sign-in redirects the browser; no need to call onAuthSuccess.
    } catch (error) {
      console.error(`${normalizedProvider} sign in error:`, error);
      message.error(t('betterAuth.signin.socialError'));
      setSocialLoading(null);
    }
  };

  const handleSignIn = async (values: SignInFormValues) => {
    setLoading(true);
    try {
      const result = await signIn.email({
        callbackURL: finalCallbackUrl,
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      if (result.error) {
        message.error(result.error.message || t('betterAuth.signin.error'));
        return;
      }
      onAuthSuccess();
    } catch (error) {
      console.error('Sign in error:', error);
      message.error(t('betterAuth.signin.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpFormValues) => {
    setLoading(true);
    try {
      const email = values.email.trim().toLowerCase();
      const username = email.split('@')[0];
      const result = await signUp.email({
        callbackURL: finalCallbackUrl,
        email,
        name: username,
        password: values.password,
      });
      if (result.error) {
        message.error(result.error.message || t('betterAuth.signup.error'));
        return;
      }
      onAuthSuccess();
    } catch (error) {
      console.error('Sign up error:', error);
      message.error(t('betterAuth.signup.error'));
    } finally {
      setLoading(false);
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

  const title =
    mode === 'signin' ? t('betterAuth.signin.emailStep.title') : t('betterAuth.signup.title');

  const switchPrompt =
    mode === 'signin' ? t('betterAuth.signin.noAccount') : t('betterAuth.signup.hasAccount');
  const switchLabel =
    mode === 'signin' ? t('betterAuth.signin.signupLink') : t('betterAuth.signup.signinLink');

  return (
    <Flexbox gap={24} padding={24}>
      <Text fontSize={24} style={{ textAlign: 'center' }} weight={'bold'}>
        {title}
      </Text>

      {oAuthSSOProviders.length > 0 ? (
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
        </Flexbox>
      ) : (
        <Flexbox gap={12}>
          <Skeleton.Button active block size="large" />
          <Skeleton.Button active block size="large" />
        </Flexbox>
      )}

      {!disableEmailPassword && (
        <>
          <Divider style={{ margin: 0 }}>
            <Text fontSize={12} type={'secondary'}>
              {t('betterAuth.signin.orContinueWith')}
            </Text>
          </Divider>

          {mode === 'signin' ? (
            <Form form={signInForm} layout="vertical" onFinish={handleSignIn}>
              <Form.Item
                name="email"
                rules={[
                  { message: t('betterAuth.errors.emailRequired'), required: true },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      return EMAIL_REGEX.test((value as string).trim())
                        ? Promise.resolve()
                        : Promise.reject(new Error(t('betterAuth.errors.emailInvalid')));
                    },
                  },
                ]}
              >
                <Input
                  placeholder={t('betterAuth.signin.emailPlaceholder')}
                  prefix={<Icon icon={Mail} style={{ marginInline: 6 }} />}
                  ref={emailInputRef as never}
                  size="large"
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ message: t('betterAuth.errors.passwordRequired'), required: true }]}
              >
                <Input.Password
                  placeholder={t('betterAuth.signin.passwordPlaceholder')}
                  prefix={<Icon icon={Lock} style={{ marginInline: 6 }} />}
                  size="large"
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  block
                  htmlType="submit"
                  icon={ChevronRight}
                  loading={loading}
                  size="large"
                  type="primary"
                >
                  {t('betterAuth.signin.submit')}
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form form={signUpForm} layout="vertical" onFinish={handleSignUp}>
              <Form.Item
                name="email"
                rules={[
                  { message: t('betterAuth.errors.emailRequired'), required: true },
                  { message: t('betterAuth.errors.emailInvalid'), type: 'email' },
                ]}
              >
                <Input
                  placeholder={t('betterAuth.signup.emailPlaceholder')}
                  prefix={<Icon icon={Mail} style={{ marginInline: 6 }} />}
                  ref={emailInputRef as never}
                  size="large"
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
                      return hasLetter && hasNumber
                        ? Promise.resolve()
                        : Promise.reject(new Error(t('betterAuth.errors.passwordFormat')));
                    },
                  },
                ]}
              >
                <Input.Password
                  placeholder={t('betterAuth.signup.passwordPlaceholder')}
                  prefix={<Icon icon={Lock} style={{ marginInline: 6 }} />}
                  size="large"
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
                  prefix={<Icon icon={Lock} style={{ marginInline: 6 }} />}
                  size="large"
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button block htmlType="submit" loading={loading} size="large" type="primary">
                  {t('betterAuth.signup.submit')}
                </Button>
              </Form.Item>
            </Form>
          )}
        </>
      )}

      <Flexbox horizontal align={'center'} gap={6} justify={'center'}>
        <Text fontSize={13} type={'secondary'}>
          {switchPrompt}
        </Text>
        <Text
          fontSize={13}
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {switchLabel}
        </Text>
      </Flexbox>
    </Flexbox>
  );
});

AuthModalContent.displayName = 'AuthModalContent';

export default AuthModalContent;
