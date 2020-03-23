import { createWorkerAddon } from '@watchedcom/sdk';
import twitch from './twitch';

export const twitchAddon = createWorkerAddon({
  id: 'twitch',
  name: 'Twitch Games',
  version: '0.0.1',
  itemTypes: ['channel'],
  defaultDirectoryOptions: {
    imageShape: 'landscape',
    displayName: true,
  },
  defaultDirectoryFeatures: {
    search: { enabled: true },
  },
  dashboards: [
    {
      id: '',
      name: 'Twitch Games',
    },
    {
      id: 'channels',
      name: 'Top Twitch Channels',
    },
  ],
});

twitchAddon.registerActionHandler('directory', async (input, ctx) => {
  if (input.id) {
    return await twitch.getChannels(input);
  } else if (input.search) {
    return await twitch.searchChannels(input);
  } else {
    return await twitch.getGames(input);
  }
});

twitchAddon.registerActionHandler('item', async (input, ctx) => {
  return await twitch.getChannel(input);
});

twitchAddon.registerActionHandler('source', async (input, ctx) => {
  return [];
});
