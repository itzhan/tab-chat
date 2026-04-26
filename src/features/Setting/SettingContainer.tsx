'use client';

import { type FlexboxProps } from '@lobehub/ui';
import { Flexbox } from '@lobehub/ui';
import { cssVar, useTheme } from 'antd-style';
import { type PropsWithChildren, type ReactNode } from 'react';
import { memo } from 'react';

interface SettingContainerProps extends FlexboxProps {
  addonAfter?: ReactNode;
  addonBefore?: ReactNode;
  maxWidth?: number | string;
  variant?: 'default' | 'secondary';
}
const SettingContainer = memo<PropsWithChildren<SettingContainerProps>>(
  ({ variant, maxWidth = 1024, children, addonAfter, addonBefore, style, ...rest }) => {
    const theme = useTheme(); // Keep for colorBgContainerSecondary (not in cssVar)
    return (
      <Flexbox
        align={'center'}
        height={'100%'}
        width={'100%'}
        style={{
          background:
            variant === 'secondary' ? theme.colorBgContainerSecondary : cssVar.colorBgContainer,
          // Vertical scroll is the normal case; horizontal scroll only kicks in
          // if the form contents really cannot fit (e.g. extremely narrow split
          // panes). The flex chain above this component now passes
          // min-width: 0 down so the inner Flexbox can shrink below maxWidth
          // and adapt to the actual viewport width.
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'auto',
          ...style,
        }}
        {...rest}
      >
        {addonBefore}
        <Flexbox
          flex={1}
          gap={36}
          style={{
            maxWidth,
            minWidth: 0,
            width: '100%',
          }}
        >
          {children}
        </Flexbox>
        {addonAfter}
      </Flexbox>
    );
  },
);

export default SettingContainer;
