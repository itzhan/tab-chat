import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';
import { keyframes } from 'antd-style';

const FONT_EMOJI =
  '"Segoe UI Emoji","Segoe UI Symbol","Apple Color Emoji","Twemoji Mozilla","Noto Color Emoji","Android Emoji"';
const FONT_EN =
  '"HarmonyOS Sans","Segoe UI","SF Pro Display",-apple-system,BlinkMacSystemFont,Roboto,Oxygen,Ubuntu,Cantarell,"Open Sans","Helvetica Neue",sans-serif';
const FONT_CN =
  '"HarmonyOS Sans SC","PingFang SC","Hiragino Sans GB","Microsoft Yahei UI","Microsoft Yahei","Source Han Sans CN",sans-serif';

const baseToken = {
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  borderRadiusXS: 4,
  controlHeight: 36,
  fontFamily: [FONT_EN, FONT_CN, FONT_EMOJI].join(','),
  fontFamilyCode: [
    'Hack,ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas',
    FONT_CN,
    FONT_EMOJI,
  ].join(','),
};

const primaryColors = {
  blue: '#1677ff',
  cyan: '#13c2c2',
  geekblue: '#2f54eb',
  gold: '#faad14',
  green: '#52c41a',
  lime: '#a0d911',
  magenta: '#eb2f96',
  orange: '#fa8c16',
  purple: '#722ed1',
  red: '#f5222d',
  volcano: '#fa541c',
  yellow: '#fadb14',
};

interface CreateWebAntdThemeOptions {
  appearance: string;
  neutralColor?: string;
  primaryColor?: keyof typeof primaryColors | string;
}

export const createWebAntdTheme = ({
  appearance,
  neutralColor,
  primaryColor,
}: CreateWebAntdThemeOptions): ThemeConfig => {
  const colorPrimary = primaryColor
    ? (primaryColors[primaryColor as keyof typeof primaryColors] ?? primaryColor)
    : undefined;

  return {
    algorithm: appearance === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    components: {
      Button: { contentFontSizeSM: 12 },
      DatePicker: {
        activeBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
        hoverBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
      },
      Input: {
        activeBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
        hoverBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
      },
      InputNumber: {
        activeBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
        hoverBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
      },
      Mentions: {
        activeBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
        hoverBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
      },
      Select: {
        activeBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
        hoverBorderColor: 'var(--lobe-color-border, rgba(128, 128, 128, 0.35))',
      },
    },
    token: {
      ...baseToken,
      colorInfo: colorPrimary,
      colorPrimary,
      neutralColor,
      primaryColor,
    },
  } as ThemeConfig;
};

const presetColors = [
  'red',
  'volcano',
  'orange',
  'gold',
  'yellow',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
  'magenta',
  'gray',
] as const;

const tokenValue = (token: Record<string, string>, key: string, fallback: string) =>
  token[key] ?? fallback;

const colorMix = (color: string, opacity: number) =>
  `color-mix(in srgb, ${color} ${opacity}%, transparent)`;

const generatePresetColorToken = (token: Record<string, string>) => {
  const result: Record<string, string> = {};

  for (const color of presetColors) {
    const base = tokenValue(
      token,
      color,
      primaryColors[color as keyof typeof primaryColors] ?? '#8c8c8c',
    );

    for (let index = 1; index <= 11; index += 1) {
      const key = `${color}${index}`;
      const colorValue = tokenValue(token, key, base);
      result[key] = colorValue;
      result[`${key}A`] = colorMix(colorValue, Math.min(96, 8 + index * 8));
    }

    result[`${color}Fill`] = colorMix(base, 18);
    result[`${color}FillSecondary`] = colorMix(base, 14);
    result[`${color}FillTertiary`] = colorMix(base, 10);
    result[`${color}FillQuaternary`] = colorMix(base, 6);
    result[`${color}Bg`] = colorMix(base, 8);
    result[`${color}BgHover`] = colorMix(base, 12);
    result[`${color}Border`] = colorMix(base, 36);
    result[`${color}BorderSecondary`] = colorMix(base, 24);
    result[`${color}BorderHover`] = colorMix(base, 48);
    result[`${color}Hover`] = tokenValue(token, `${color}7`, base);
    result[color] = base;
    result[`${color}Active`] = tokenValue(token, `${color}8`, base);
    result[`${color}TextHover`] = tokenValue(token, `${color}7`, base);
    result[`${color}Text`] = base;
    result[`${color}TextActive`] = tokenValue(token, `${color}8`, base);
  }

  return result;
};

const generateSystemColorToken = (token: Record<string, string>) => ({
  colorErrorFill: tokenValue(token, 'colorErrorBgActive', colorMix(token.colorError, 18)),
  colorErrorFillQuaternary: colorMix(token.colorError, 6),
  colorErrorFillSecondary: tokenValue(token, 'colorErrorBgHover', colorMix(token.colorError, 14)),
  colorErrorFillTertiary: tokenValue(token, 'colorErrorBg', colorMix(token.colorError, 10)),
  colorInfoFill: tokenValue(token, 'colorInfoBgActive', colorMix(token.colorInfo, 18)),
  colorInfoFillQuaternary: colorMix(token.colorInfo, 6),
  colorInfoFillSecondary: tokenValue(token, 'colorInfoBgHover', colorMix(token.colorInfo, 14)),
  colorInfoFillTertiary: tokenValue(token, 'colorInfoBg', colorMix(token.colorInfo, 10)),
  colorSuccessFill: tokenValue(token, 'colorSuccessBgActive', colorMix(token.colorSuccess, 18)),
  colorSuccessFillQuaternary: colorMix(token.colorSuccess, 6),
  colorSuccessFillSecondary: tokenValue(
    token,
    'colorSuccessBgHover',
    colorMix(token.colorSuccess, 14),
  ),
  colorSuccessFillTertiary: tokenValue(token, 'colorSuccessBg', colorMix(token.colorSuccess, 10)),
  colorWarningFill: tokenValue(token, 'colorWarningBgActive', colorMix(token.colorWarning, 18)),
  colorWarningFillQuaternary: colorMix(token.colorWarning, 6),
  colorWarningFillSecondary: tokenValue(
    token,
    'colorWarningBgHover',
    colorMix(token.colorWarning, 14),
  ),
  colorWarningFillTertiary: tokenValue(token, 'colorWarningBg', colorMix(token.colorWarning, 10)),
});

export const generateWebCustomToken = ({ token }: { token: Record<string, string> }) => ({
  ...generatePresetColorToken(token),
  ...generateSystemColorToken(token),
  colorBgContainerSecondary: `color-mix(in srgb, ${token.colorBgLayout} 50%, ${token.colorBgContainer})`,
});

export const generateWebCustomStylish = ({
  css,
  token,
  isDarkMode,
}: {
  css: any;
  isDarkMode: boolean;
  token: Record<string, string>;
}) => {
  const gradient = keyframes`
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  `;

  return {
    active: css`
      color: ${token.colorText};
      background: ${token.colorFillSecondary};

      &:hover {
        color: ${token.colorText};
        background: ${token.colorFill};
      }
    `,
    blur: css`
      backdrop-filter: saturate(150%) blur(10px);
    `,
    blurStrong: css`
      backdrop-filter: saturate(150%) blur(36px);
    `,
    bottomScrollbar: css`
      ::-webkit-scrollbar {
        width: 0;
        height: 4px;
        background-color: transparent;

        &-thumb {
          border-radius: 4px;
          background-color: ${token.colorFill};
          transition: background-color 500ms ${token.motionEaseOut};
        }

        &-corner {
          display: none;
          width: 0;
          height: 0;
        }
      }
    `,
    disabled: css`
      cursor: not-allowed;
      opacity: 0.5;
    `,
    gradientAnimation: css`
      border-radius: inherit;
      background-image: linear-gradient(
        -45deg,
        ${token.gold},
        ${token.magenta},
        ${token.geekblue},
        ${token.cyan}
      );
      background-size: 400% 400%;
      animation: 5s ${gradient} 5s ease infinite;
    `,
    noScrollbar: css`
      ::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
        background-color: transparent;
      }
    `,
    resetLinkColor: css`
      cursor: pointer;
      color: ${token.colorTextSecondary};

      &:hover {
        color: ${token.colorText};
      }
    `,
    shadow: css`
      box-shadow:
        0 1px 0 -1px ${isDarkMode ? token.colorBgLayout : token.colorBorder},
        0 1px 2px -0.5px ${isDarkMode ? token.colorBgLayout : token.colorBorder},
        0 2px 2px -1px ${isDarkMode ? token.colorBgLayout : token.colorBorderSecondary},
        0 3px 6px -4px ${isDarkMode ? token.colorBgLayout : token.colorBorderSecondary};
    `,
    variantBorderless: css`
      border: none;
      background: none;
      box-shadow: none;

      &:hover {
        background: ${token.colorFillTertiary};
      }
    `,
    variantBorderlessDanger: css`
      border: none;
      background: none;
      box-shadow: none;

      &:hover {
        background: ${token.colorErrorFillTertiary};
        box-shadow: inset 0 0 0 1px ${token.colorErrorFillTertiary};
      }
    `,
    variantBorderlessWithoutHover: css`
      border: none;
      background: none;
      box-shadow: none;
    `,
    variantFilled: css`
      background: ${token.colorFillTertiary};

      &:hover {
        background: ${token.colorFillSecondary};
      }
    `,
    variantFilledDanger: css`
      background: ${token.colorErrorFillTertiary};

      &:hover {
        background: ${token.colorErrorFillSecondary};
      }
    `,
    variantFilledWithoutHover: css`
      background: ${token.colorFillTertiary};
    `,
    variantOutlined: css`
      border: 1px solid ${token.colorBorderSecondary};
      background: ${token.colorBgContainer};

      &:hover {
        border: 1px solid ${token.colorBorder};
        background: ${token.colorBgContainer};
      }
    `,
    variantOutlinedDanger: css`
      border: 1px solid ${token.colorErrorBorder};

      &:hover {
        border: 1px solid ${token.colorErrorBorder};
      }
    `,
    variantOutlinedWithoutHover: css`
      border: 1px solid ${token.colorBorderSecondary};
      background: ${token.colorBgContainer};
    `,
  };
};
