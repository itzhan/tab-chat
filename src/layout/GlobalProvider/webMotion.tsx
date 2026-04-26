import type * as Motion from 'motion/react-m';
import { createElement, Fragment, type ReactNode } from 'react';

const motionOnlyProps = new Set([
  'animate',
  'custom',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'exit',
  'initial',
  'layout',
  'layoutId',
  'transition',
  'variants',
  'whileDrag',
  'whileFocus',
  'whileHover',
  'whileInView',
  'whileTap',
  'onAnimationComplete',
  'onAnimationStart',
  'onUpdate',
]);

interface WebMotionProps {
  [key: string]: any;
  children?: ReactNode;
}

const createWebMotionElement =
  (tag: string) =>
  ({ ref, children, ...props }: WebMotionProps & { ref?: React.RefObject<Element | null> }) => {
    const domProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => !motionOnlyProps.has(key)),
    );

    return createElement(tag, { ...domProps, ref }, children as ReactNode);
  };

const elementCache = new Map<string, ReturnType<typeof createWebMotionElement>>();

const webMotion = new Proxy(
  {},
  {
    get: (_, key) => {
      if (key === 'Fragment') return Fragment;
      if (typeof key !== 'string') return undefined;

      const cached = elementCache.get(key);
      if (cached) return cached;

      const element = createWebMotionElement(key);
      elementCache.set(key, element);
      return element;
    },
  },
);

export default webMotion as typeof Motion;
