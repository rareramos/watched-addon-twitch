import { ChannelItem, WorkerHandlers, DirectoryItem, DirectoryFeatures } from '@watchedcom/sdk';
import TwitchClient from 'twitch';

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_SECRET_KEY as string;
const twitchClient = TwitchClient.withClientCredentials(clientId, clientSecret);

export const directoryHandler: WorkerHandlers['directory'] = async (input, ctx) => {
  return {
    hasMore: false,
    items: [],
    features: {
      filter: [],
    },
  };
};

export const itemHandler: WorkerHandlers['item'] = async (input, ctx) => {
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
};

export const sourceHandler: WorkerHandlers['source'] = async (input, ctx) => {
  return [];
};
