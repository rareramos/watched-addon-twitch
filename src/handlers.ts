import { WorkerHandlers } from '@watchedcom/sdk';
import twitch from './twitch';

// input {id, search, filter, page}
export const directoryHandler: WorkerHandlers['directory'] = async (input: any, ctx) => {
  //console.log(input);
  if (input.id === 'channels') {
    return {
      hasMore: false,
      items: [],
      features: {
        filter: [],
      },
    };
  } else {
    const result = await twitch.getGames(input);
    return result;
  }
};

export const itemHandler: WorkerHandlers['item'] = async (input: any, ctx) => {
  //console.log(input);
  return await twitch.getGame(input);
  /*
  return {
    type: 'channel',
    ids: input.ids,
    name: `Channel 1`,
    description: `description`,
    sources: [
      {
        id: 'main',
        type: 'url',
        url: `https://twitch.com/ok`,
      },
    ],
  };
  */
};

export const sourceHandler: WorkerHandlers['source'] = async (input, ctx) => {
  return [];
};
