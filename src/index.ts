import { createWorkerAddon, runCli } from '@watchedcom/sdk';
import twitch from './twitch';
import { format as formatUrl, parse as parseUrl } from 'url';

const twitchAddon = createWorkerAddon({
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

twitchAddon.addResolveHandler(
  new RegExp('/api.twitch.tv/api/channels'),
  async (match, input, ctx) => {
    const displayName = input.url.match(/s\/.+\/a/);
    const data = { displayName: (displayName && displayName[0].slice(2, -2)) || '', url: '' };
    const result = await twitch.get(input.url);
    if (result.sig) {
      data.url = formatUrl({
        host: 'usher.ttvnw.net',
        protocol: 'https',
        pathname: `api/channel/hls/${encodeURIComponent(data.displayName).toLowerCase()}.m3u8`,
        query: {
          player: 'twitchweb',
          token: result.token,
          sig: result.sig,
          allow_audio_only: 'true',
          allow_source: 'true',
          type: 'any',
          p: Math.floor(Math.random() * 999999 + 1),
        },
      });
    } else {
      return [];
    }
    return data.url;
  }
);

runCli([twitchAddon], {
  singleMode: true,
});
