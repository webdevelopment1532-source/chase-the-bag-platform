import { announceUpcomingEvents } from '../src/events';

function makeChannel(name: string, textBased = true) {
  return {
    name,
    isTextBased: textBased,
    send: jest.fn().mockResolvedValue(undefined),
  };
}

function makeGuild(channels: ReturnType<typeof makeChannel>[]) {
  const channelMap = new Map(channels.map((c) => [c.name, c]));
  return {
    channels: {
      cache: {
        find: (pred: (ch: any) => boolean) => [...channelMap.values()].find(pred),
      },
    },
  };
}

function makeClient(guilds: ReturnType<typeof makeGuild>[]) {
  const guildMap = new Map(guilds.map((g, i) => [String(i), g]));
  return {
    guilds: { cache: guildMap },
  } as any;
}

describe('announceUpcomingEvents', () => {
  test('sends event announcements to the events channel', () => {
    const eventsChannel = makeChannel('events');
    const client = makeClient([makeGuild([eventsChannel])]);

    announceUpcomingEvents(client);

    // Two events defined in events.ts
    expect(eventsChannel.send).toHaveBeenCalledTimes(2);
  });

  test('announcement contains event name', () => {
    const eventsChannel = makeChannel('events');
    const client = makeClient([makeGuild([eventsChannel])]);

    announceUpcomingEvents(client);

    const firstCall = (eventsChannel.send.mock.calls[0][0] as string);
    expect(firstCall).toContain('Weekly Tournament');
  });

  test('second announcement contains Flash Bonus', () => {
    const eventsChannel = makeChannel('events');
    const client = makeClient([makeGuild([eventsChannel])]);

    announceUpcomingEvents(client);

    const secondCall = (eventsChannel.send.mock.calls[1][0] as string);
    expect(secondCall).toContain('Flash Bonus');
  });

  test('does not send when there is no events channel', () => {
    const otherChannel = makeChannel('general');
    const client = makeClient([makeGuild([otherChannel])]);

    announceUpcomingEvents(client);

    expect(otherChannel.send).not.toHaveBeenCalled();
  });

  test('sends to events channel across multiple guilds', () => {
    const ch1 = makeChannel('events');
    const ch2 = makeChannel('events');
    const client = makeClient([makeGuild([ch1]), makeGuild([ch2])]);

    announceUpcomingEvents(client);

    expect(ch1.send).toHaveBeenCalledTimes(2);
    expect(ch2.send).toHaveBeenCalledTimes(2);
  });

  test('skips guild with no matching channel', () => {
    const eventsChannel = makeChannel('events');
    const noMatch = makeChannel('other');
    const client = makeClient([makeGuild([eventsChannel]), makeGuild([noMatch])]);

    announceUpcomingEvents(client);

    expect(eventsChannel.send).toHaveBeenCalledTimes(2);
    expect(noMatch.send).not.toHaveBeenCalled();
  });
});
