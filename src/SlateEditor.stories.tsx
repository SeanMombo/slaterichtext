import type { Meta, StoryObj } from '@storybook/react';
import SlateEditor from './SlateEditor';

const meta = {
  title: 'Components/SlateEditor',
  component: SlateEditor,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SlateEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
}; 