import { describe, expect, it } from 'vitest';
import { channelAllowsCompose, channelComposeMode } from './channel-composer-actions';

describe('channel-composer-actions', () => {
  it('allows send_internal and submit_message from Backend actions', () => {
    expect(
      channelAllowsCompose({
        can_send: true,
        read_only: false,
        allowed_message_actions: ['send_internal'],
      }),
    ).toBe(true);
    expect(
      channelAllowsCompose({
        can_send: true,
        read_only: false,
        allowed_message_actions: ['submit_message'],
      }),
    ).toBe(true);
  });

  it('allows compose when Backend can_send even if read_only flag is set', () => {
    expect(
      channelAllowsCompose({
        can_send: true,
        read_only: true,
        allowed_message_actions: ['submit_message'],
      }),
    ).toBe(true);
  });

  it('blocks when can_send is false regardless of read_only', () => {
    expect(
      channelAllowsCompose({
        can_send: false,
        read_only: false,
        allowed_message_actions: ['submit_message'],
      }),
    ).toBe(false);
    expect(
      channelAllowsCompose({
        can_send: false,
        read_only: true,
        allowed_message_actions: ['send_internal'],
      }),
    ).toBe(false);
  });

  it('resolves compose mode without local direction calculation', () => {
    expect(
      channelComposeMode({
        allowed_message_actions: ['send_internal'],
        requires_message_moderation: false,
        is_internal_staff_only: true,
      }),
    ).toBe('internal');
    expect(
      channelComposeMode({
        allowed_message_actions: ['submit_message'],
        requires_message_moderation: true,
        is_internal_staff_only: false,
      }),
    ).toBe('submit');
  });
});
