import { createWorkerAddon, WorkerHandlers } from '@watchedcom/sdk';
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
    //search: { enabled: true },
  },
  dashboards: [
    {
      id: '',
      name: 'Twitch Games',
    },
  ],
});

// input {id, search, filter, page}
const directoryHandler: WorkerHandlers['directory'] = async (input: any, ctx) => {
  if (input.id) {
    return await twitch.getChannels(input);
  } else if (input.search) {
    return await twitch.searchChannels(input);
  } else {
    return await twitch.getGames(input);
  }
};

const itemHandler: WorkerHandlers['item'] = async (input: any, ctx) => {
  return await twitch.getChannel(input);
};

const sourceHandler: WorkerHandlers['source'] = async (input, ctx) => {
  return [];
};

twitchAddon.registerActionHandler('directory', directoryHandler);

twitchAddon.registerActionHandler('item', itemHandler);

twitchAddon.registerActionHandler('source', sourceHandler);
