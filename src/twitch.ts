import { ChannelItem, DirectoryItem, DirectoryFeatures } from '@watchedcom/sdk';
import fetch from 'node-fetch';
import { parse as parseUrl, format as formatUrl } from 'url';
import { capitalize } from 'lodash';
import * as m3u8 from 'm3u8-parser';

const apiUrl = 'https://api.twitch.tv';

const logger = (...args) => {
  //if (process.env.DEBUG) {
  console.log(`API `, ...args);
  //}
};

const websiteFilters: DirectoryFeatures['filter'] = [
  {
    name: 'Language',
    id: 'language',
    values: [
      {
        value: 'All',
        key: '',
      },
      {
        value: 'English',
        key: 'en',
      },
      {
        value: 'German',
        key: 'de',
      },
    ],
  },
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
];

class TwitchApi {
  async getChannels({ filter = {}, page }) {
    const limit = 25;
    const offset = page > 0 ? (page - 1) * limit : 0;
    return await this.get('kraken/streams', {
      ...filter,
      limit,
      offset,
    }).then(({ streams }) => {
      const items = Array.from(streams || []).map<ChannelItem>(({ channel }: any) => ({
        id: channel._id,
        type: 'channel',
        name: channel.status,
        game: channel.game,
        language: channel.language,
        ids: {
          id: channel._id,
        },
        images: {
          logo: channel.logo || undefined,
          poster: channel.video_banner || undefined,
          background: channel.profile_banner || undefined,
        },
      }));
      return {
        hasMore: streams.length === limit,
        items,
        features: {
          filter: websiteFilters,
        },
      };
    });
  }

  async getGames({ page }) {
    const limit = 25;
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
        args: { filter: { game: game.name } },
      }));
      return {
        hasMore: offset + limit < _total,
        items,
        features: {
          filter: [],
        },
      };
    });
  }

  async getChannel({ ids }): Promise<ChannelItem> {
    const channel: ChannelItem = await this.get(`kraken/channels/${ids.id}`).then((item: any) => {
      return {
        id: item.display_name,
        type: 'channel',
        ids: { id: item._id },
        name: item.status,
        description: item.description,
        releaseDate: item.created_at,
        poster: item.video_banner || undefined,
        game: item.game,
        language: item.language,
        url: item.url,
        images: {
          logo: item.logo,
          poster: item.video_banner || undefined,
          background: item.profile_banner,
        },
      };
    });

    channel.sources = [
      {
        id: channel.id,
        name: channel.name,
        type: 'externalUrl',
        url: channel.url,
      },
    ];
    /*
    const result = await this.get(
      `http://api.twitch.tv/api/channels/${encodeURIComponent(channel.id)}/access_token`,
      { oauth_token: '7j41xaddjxx4pmbtl1bqecikm19zfb' }
    );

    if (result.sig) {
      const result2 = await this.get(
        `https://usher.ttvnw.net/api/channel/hls/${encodeURIComponent(
          channel.id
        ).toLowerCase()}.m3u8`,
        {
          player: 'twitchweb',
          token: result.token,
          sig: result.sig,
          allow_audio_only: 'true',
          allow_source: 'true',
          type: 'any',
          p: Math.floor(Math.random() * 999999 + 1),
        }
      );
      //console.log(result2);
      let parser = new m3u8.Parser();
      parser.push(result2);
      parser.end();
      console.log(JSON.stringify(parser.manifest));
      const playlist = parser.manifest.playlists.find(pl => pl.attributes.VIDEO === '360p30');
      playlist.uri;
      const result3 = await this.get(playlist.uri);
      parser = new m3u8.Parser();
      parser.push(result3);
      parser.end();
      console.log(JSON.stringify(parser.manifest));
    } else {
      channel.sources = [
        {
          id: channel.id,
          title: channel.name,
          type: 'externalUrl',
          url: channel.url,
        },
      ];
    }
    */

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

async function boot() {
  await client.getChannel({ ids: { id: 71092938 } });
}
boot();

export default client;

/*
import TwitchClient from 'twitch';

const clientId = process.env.TWITCH_CLIENT_ID as string;
const clientSecret = process.env.TWITCH_SECRET_KEY as string;
const twitchClient = TwitchClient.withClientCredentials(clientId, clientSecret);

export default twitchClient;
*/
