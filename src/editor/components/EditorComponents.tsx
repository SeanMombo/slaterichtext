import React from 'react';
import { css } from '@emotion/css';
import { RenderElementProps, RenderLeafProps } from 'slate-react';

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
export const InlineChromiumBugfix = () => (
  <sup
    contentEditable={false}
    className={css`
      font-size: 0;
    `}
  >
    {String.fromCodePoint(160) /* Non-breaking space */}
  </sup>
);

export const BadgeComponent = ({
  attributes,
  children,
}: RenderElementProps) => {
  return (
    <sup
      {...attributes}
      className={css`
        color:rgb(248, 188, 23);
        font-size: 0.8em;
        vertical-align: super;
        user-select: auto;
        cursor: pointer;
      `}
      onClick={() => {
        console.log('clicked')
      }}
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </sup>
  );
};

export const Element = (props: RenderElementProps) => {
  const { attributes, children, element } = props;
  switch (element.type) {
    case 'badge':
      return <BadgeComponent {...props} />;
    default:
      return <p {...attributes} className="">{children}</p>;
  }
};

export const Text = (props: RenderLeafProps) => {
  const { attributes, children, leaf } = props;
  return (
    <span
      className={
        leaf.text === ''
          ? css`
              padding-left: 0.1px;
            `
          : undefined
      }
      {...attributes}
    >
      {children}
    </span>
  );
}; 