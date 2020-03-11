import { ChannelItem, DirectoryItem } from '@watchedcom/sdk';
import fetch from 'node-fetch';
import { parse as parseUrl, format as formatUrl } from 'url';

const apiUrl = 'https://api.twitch.tv';

const logger = (...args) => {
  if (process.env.DEBUG) {
    console.log(`API `, ...args);
  }
};

class TwitchApi {
  async getGames({ page }) {
    const limit = 100;
    const offset = page > 0 ? (page - 1) * limit : 0;
    return await this.get('kraken/games/top', {
      limit,
      offset,
    }).then(({ _total, top }) => {
      const items = Array.from(top || []).map<DirectoryItem>(({ game }: any) => ({
        type: 'directory',
        name: game.name,
        images: { poster: game.box.large },
        id: game._id,
        args: { filter: { typeId: game._id } },
      }));
      return {
        hasMore: offset + limit < _total,
        items,
        features: {
          filter: undefined,
        },
      };
    });
  }

  async getGame({ id }): Promise<ChannelItem> {
    return await this.get('helix/games', { id }).then((game: any) => {
      return {
        type: 'channel',
        ids: { id: game.id },
        name: game.name,
        description: '',
        poster: game.box_art_url,
        sources: [
          {
            id: 'main',
            type: 'url',
            url: `https://www.twitch.tv/directory/game/${game.name}`,
          },
        ],
      };
    });
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
    const { pathname, query = {}, ...other } = url;
    const parsedApiUrl = parseUrl(apiUrl);
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
    logger('response', res.url, res.status, res.headers.get('content-type'), data);
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
    logger('response', res.url, res.status, res.headers.get('content-type'), data);
    return data;
  }
}

const client = new TwitchApi();

export default client;

/*
import TwitchClient from 'twitch';

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_SECRET_KEY as string;
const twitchClient = TwitchClient.withClientCredentials(clientId, clientSecret);

export default twitchClient;
*/
