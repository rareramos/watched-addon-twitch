import { createWorkerAddon } from '@watchedcom/sdk';
import { directoryHandler, itemHandler, sourceHandler } from './handlers';

export const twitchAddon = createWorkerAddon({
  id: 'twitch',
  name: 'Twitch Games',
  version: '0.0.1',
  itemTypes: ['channel'],
  requestArgs: [['name', 'year']],
});

twitchAddon.registerActionHandler('directory', directoryHandler);

twitchAddon.registerActionHandler('item', itemHandler);

twitchAddon.registerActionHandler('source', sourceHandler);
