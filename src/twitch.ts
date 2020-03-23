import { ChannelItem, DirectoryItem, DirectoryFeatures, DirectoryRequest } from '@watchedcom/sdk';
import fetch from 'node-fetch';
import { parse as parseUrl, format as formatUrl } from 'url';
import _locales from './locales';

const locales = _locales.map(item => ({ key: item.code, value: item.name }));

const apiUrl = 'https://api.twitch.tv';

const logger = (...args) => {
  if (process.env.DEBUG) {
    console.log(`API `, ...args);
  }
};

const websiteFilters: DirectoryFeatures['filter'] = [
  {
    name: 'Language',
    id: 'broadcaster_language',
    values: locales,
  },
  /*
  {
    name: 'Audience',
    id: 'audience',
    values: [
      { value: 'All', key: '' },
      ...['family', 'teen', '18+'].map(_ => ({
        value: capitalize(_),
        key: _,
      })),
    ],
  },
  */
];

class TwitchApi {
  async getChannels(input: DirectoryRequest) {
    const limit = 25;
    const offset = input.cursor === 0 ? 0 : input.cursor;
    return await this.get('kraken/streams', {
      limit,
      offset,
    }).then(({ streams }) => {
      const items = Array.from(streams || []).map<ChannelItem>(({ channel }: any) =>
        this.convertChannel(channel)
      );
      return {
        nextCursor: streams.length === limit ? null : offset + streams.length,
        items,
        features: {
          filter: websiteFilters,
        },
      };
    });
  }

  async searchChannels(input: DirectoryRequest) {
    const limit = 25;
    const offset = input.cursor === 0 ? 0 : input.cursor;
    return await this.get('kraken/search/streams', {
      query: input.search,
      limit,
      offset,
    }).then(({ streams }) => {
      const items = Array.from(streams || []).map<ChannelItem>(({ channel }: any) =>
        this.convertChannel(channel)
      );
      return {
        nextCursor: streams.length === limit ? null : offset + streams.length,
        items,
        features: {
          filter: websiteFilters,
        },
      };
    });
  }

  async getGames(input: DirectoryRequest) {
    const limit = 25;
    const offset = input.cursor === null ? 0 : <number>input.cursor;
    return await this.get('kraken/games/top', {
      limit,
      offset,
    }).then(({ _total, top }) => {
      const items = Array.from(top || []).map<DirectoryItem>(({ game }: any) =>
        this.convertGame(game)
      );
      return {
        nextCursor: offset + limit < _total ? offset + items.length : null,
        items,
        features: {
          filter: [],
        },
      };
    });
  }

  async getChannel({ ids }): Promise<ChannelItem> {
    let channel: ChannelItem;
    const data = await this.get(`kraken/channels/${ids.id}`);
    const result = await this.get(
      `http://api.twitch.tv/api/channels/${encodeURIComponent(data.display_name)}/access_token`
    );
    if (result.sig) {
      const videoUrl = formatUrl({
        host: 'usher.ttvnw.net',
        protocol: 'https',
        pathname: `api/channel/hls/${encodeURIComponent(data.display_name).toLowerCase()}.m3u8`,
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
      data.videoUrl = videoUrl;
    } else {
      data.externalUrl = data.url;
    }
    channel = this.convertChannel(data);
    return channel;
  }

  async getGame({ id }): Promise<DirectoryItem> {
    return await this.get(`helix/games`, { id }).then(({ data }: any) => {
      const game = data[0] || {};
      const poster = this.getImage(game.box_art_url) || undefined;
      return {
        type: 'directory',
        name: game.name,
        images: { poster },
        id: game.id,
        // args: { filter: { typeId: game.id } },
      };
    });
  }

  getImage(url: string, w = 285, h = 380) {
    return String(url)
      .replace('{width}', String(w))
      .replace('{height}', String(h));
  }

  convertGame(data: any): DirectoryItem {
    const game: DirectoryItem = {
      type: 'directory',
      name: data.name,
      images: { poster: data.box.large },
      id: data._id,
      args: { filter: { game: data.name } },
    };
    return game;
  }

  convertChannel(data: any): ChannelItem {
    const channel: ChannelItem = {
      id: data.display_name,
      type: 'channel',
      ids: { id: data._id },
      name: data.status,
      description: data.description,
      releaseDate: data.created_at,
      game: data.game,
      language: data.broadcaster_language,
      url: data.url,
      images: {
        logo: data.logo || undefined,
        poster: data.video_banner || undefined,
        background: data.profile_banner || undefined,
      },
      sources: [],
    };
    if (data.videoUrl) {
      channel.sources?.push({
        id: channel.id,
        name: channel.name,
        type: 'url',
        url: data.videoUrl,
      });
    }
    if (data.externalUrl) {
      channel.sources?.push({
        id: channel.id,
        name: channel.name,
        type: 'externalUrl',
        url: data.externalUrl,
      });
    }
    return channel;
  }

  async get(pathname = '', query = {}, options = {}) {
    return this.api({ pathname, query }, options);
  }

  async post(pathname, data = {}, query = {}, options = {}) {
    return this.api(
      { pathname, query },
      {
        ...options,
        method: 'post',
        body: data,
      }
    );
  }

  async put(pathname, data = {}, query = {}, options = {}) {
    return this.api(
      { pathname, query },
      {
        ...options,
        method: 'put',
        body: data,
      }
    );
  }

  async delete(pathname, query = {}, options = {}) {
    return this.api(
      { pathname, query },
      {
        ...options,
        method: 'delete',
      }
    );
  }

  async api(url, options: any = {}) {
    let { body, headers = {} } = options;
    const clientId = process.env.TWITCH_CLIENT_ID;
    headers = {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Content-Type': 'application/json',
      ...headers,
    };
    if (clientId) {
      headers['Client-ID'] = clientId;
    }
    if (body && typeof body === 'object') {
      if (headers['Content-Type'] === 'application/json') {
        body = this.handleBodyAsJson(body);
      } else if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        body = this.handleBodyAsFormUrlencoded(body);
      }
    }
    let opts = { ...options, body, headers };
    const apiUrl = this.apiUrl(url);
    logger('request', apiUrl, opts);
    const res = await fetch(apiUrl, opts);
    return this.handleResponse(res);
  }

  apiUrl(url: any = {}) {
    let { pathname, query = {}, ...other } = url;
    let parsedApiUrl = parseUrl(apiUrl);
    if (String(pathname).startsWith('http')) {
      parsedApiUrl = parseUrl(pathname);
      pathname = parsedApiUrl.pathname;
    }
    return formatUrl({
      ...parsedApiUrl,
      pathname,
      query,
      ...other,
    });
  }

  async handleResponse(res) {
    const contentType = res.headers.get('content-type') || 'text';
    if (contentType.includes('json')) {
      return this.handleResponseAsJson(res);
    }
    return this.handleResponseAsText(res);
  }

  handleBodyAsJson(data = {}) {
    return JSON.stringify(data);
  }

  handleBodyAsFormUrlencoded(body) {
    return Object.entries(body)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) =>
        Array.isArray(value) ? value.map(item => `${key}=${item}`).join('&') : `${key}=${value}`
      )
      .join('&');
  }

  async handleResponseAsJson(res) {
    if (res.status >= 400) {
      const error = await res.json();
      logger('error', error);
      throw error;
    }
    if (res.status === 204) {
      return null;
    }
    let data = await res.json();
    data = typeof data === 'string' ? JSON.parse(data) : data;
    //logger('response', res.url, res.status, res.headers.get('content-type'), data);
    return data;
  }

  async handleResponseAsText(res) {
    if (res.status >= 400) {
      const error = await res.text();
      logger('error', error);
      throw error;
    }
    if (res.status === 204) {
      return null;
    }
    const data = await res.text();
    //logger('response', res.url, res.status, res.headers.get('content-type'), data);
    return data;
  }
}

const client = new TwitchApi();

/*
async function boot() {
  await client.getChannel({ ids: { id: 41203135 } });
}
boot();
*/

export default client;

/*
import TwitchClient from 'twitch';

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_SECRET_KEY as string;
const twitchClient = TwitchClient.withClientCredentials(clientId, clientSecret);

export default twitchClient;
*/
