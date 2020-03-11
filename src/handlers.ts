import { WorkerHandlers } from '@watchedcom/sdk';
import twitch from './twitch';

// input {id, search, filter, page}
export const directoryHandler: WorkerHandlers['directory'] = async (input: any, ctx) => {
  //console.log(input);
  if (input.id === 'channels') {
    return await twitch.getChannels(input);
  } else if (input.id) {
    const game = await twitch.getGame(input);
    return {
      hasMore: false,
      items: [game],
    };
  } else {
    return await twitch.getGames(input);
  }
};

export const itemHandler: WorkerHandlers['item'] = async (input: any, ctx) => {
  //console.log(input);
  return await twitch.getChannel(input);
};

export const sourceHandler: WorkerHandlers['source'] = async (input, ctx) => {
  return [];
};
