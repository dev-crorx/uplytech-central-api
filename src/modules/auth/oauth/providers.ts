import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import { config } from '../../../core/config';
import { ModuleLogger } from '../../../core/logger';

const log = new ModuleLogger('OAuthProviders');

export const OAUTH_PROVIDERS = [
  'google', 'github', 'discord', 'twitter', 'facebook', 'apple',
  'microsoft', 'twitch', 'spotify', 'linkedin', 'gitlab', 'slack', 'steam',
] as const;

export type OAuthProvider = typeof OAUTH_PROVIDERS[number];

interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  displayName: string;
  avatar?: string;
  raw: Record<string, unknown>;
}

function normalizeProfile(provider: string, profile: Record<string, unknown>): OAuthProfile {
  const p = profile as {
    id?: string;
    emails?: Array<{ value: string }>;
    displayName?: string;
    username?: string;
    photos?: Array<{ value: string }>;
    _json?: Record<string, unknown>;
  };

  const email = p.emails?.[0]?.value || '';
  const displayName = p.displayName || p.username || '';
  const avatar = p.photos?.[0]?.value || '';

  return {
    provider,
    providerId: String(p.id || ''),
    email,
    displayName,
    avatar,
    raw: (p._json || profile) as Record<string, unknown>,
  };
}

const oauthCallback = (provider: string) => {
  return (
    _accessToken: string,
    _refreshToken: string,
    profile: Record<string, unknown>,
    done: (err: Error | null, user?: OAuthProfile) => void
  ) => {
    try {
      const normalized = normalizeProfile(provider, profile);
      done(null, normalized);
    } catch (error) {
      done(error as Error);
    }
  };
};

export function initializeOAuthProviders(): void {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  if (config.oauth.google.clientId) {
    passport.use(new GoogleStrategy({
      clientID: config.oauth.google.clientId,
      clientSecret: config.oauth.google.clientSecret,
      callbackURL: config.baseUrl + config.oauth.google.callbackUrl,
      scope: ['profile', 'email'],
    }, oauthCallback('google') as never));
    log.info('Google OAuth provider initialized');
  }

  if (config.oauth.github.clientId) {
    passport.use(new GitHubStrategy({
      clientID: config.oauth.github.clientId,
      clientSecret: config.oauth.github.clientSecret,
      callbackURL: config.baseUrl + config.oauth.github.callbackUrl,
      scope: ['user:email'],
    }, oauthCallback('github') as never));
    log.info('GitHub OAuth provider initialized');
  }

  if (config.oauth.discord.clientId) {
    passport.use(new DiscordStrategy({
      clientID: config.oauth.discord.clientId,
      clientSecret: config.oauth.discord.clientSecret,
      callbackURL: config.baseUrl + config.oauth.discord.callbackUrl,
      scope: ['identify', 'email'],
    }, ((accessToken: string, refreshToken: string, profile: DiscordStrategy.Profile, done: (err: Error | null, user?: OAuthProfile) => void) => {
      try {
        const normalized: OAuthProfile = {
          provider: 'discord',
          providerId: profile.id,
          email: profile.email || '',
          displayName: profile.username || '',
          avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : '',
          raw: profile as unknown as Record<string, unknown>,
        };
        done(null, normalized);
      } catch (error) {
        done(error as Error);
      }
    }) as never));
    log.info('Discord OAuth provider initialized');
  }

  if (config.oauth.twitter.consumerKey) {
    passport.use(new TwitterStrategy({
      consumerKey: config.oauth.twitter.consumerKey,
      consumerSecret: config.oauth.twitter.consumerSecret,
      callbackURL: config.baseUrl + config.oauth.twitter.callbackUrl,
      includeEmail: true,
    }, ((accessToken: string, tokenSecret: string, profile: { id: string; emails?: Array<{ value: string }>; displayName?: string; username?: string; photos?: Array<{ value: string }>; _json: unknown }, done: (err: Error | null, user?: OAuthProfile) => void) => {
      try {
        const normalized: OAuthProfile = {
          provider: 'twitter',
          providerId: profile.id,
          email: (profile.emails?.[0] as { value: string })?.value || '',
          displayName: profile.displayName || profile.username || '',
          avatar: (profile.photos?.[0] as { value: string })?.value || '',
          raw: profile._json as Record<string, unknown>,
        };
        done(null, normalized);
      } catch (error) {
        done(error as Error);
      }
    }) as never));
    log.info('Twitter/X OAuth provider initialized');
  }

  if (config.oauth.facebook.clientId) {
    passport.use(new FacebookStrategy({
      clientID: config.oauth.facebook.clientId,
      clientSecret: config.oauth.facebook.clientSecret,
      callbackURL: config.baseUrl + config.oauth.facebook.callbackUrl,
      profileFields: ['id', 'displayName', 'email', 'photos'],
    }, oauthCallback('facebook') as never));
    log.info('Facebook OAuth provider initialized');
  }

  if (config.oauth.spotify.clientId) {
    passport.use(new SpotifyStrategy({
      clientID: config.oauth.spotify.clientId,
      clientSecret: config.oauth.spotify.clientSecret,
      callbackURL: config.baseUrl + config.oauth.spotify.callbackUrl,
      scope: ['user-read-email', 'user-read-private'],
    }, oauthCallback('spotify') as never));
    log.info('Spotify OAuth provider initialized');
  }

  log.info('OAuth providers initialization complete');
}

export function getEnabledProviders(): string[] {
  const enabled: string[] = [];
  if (config.oauth.google.clientId) enabled.push('google');
  if (config.oauth.github.clientId) enabled.push('github');
  if (config.oauth.discord.clientId) enabled.push('discord');
  if (config.oauth.twitter.consumerKey) enabled.push('twitter');
  if (config.oauth.facebook.clientId) enabled.push('facebook');
  if (config.oauth.apple.clientId) enabled.push('apple');
  if (config.oauth.microsoft.clientId) enabled.push('microsoft');
  if (config.oauth.twitch.clientId) enabled.push('twitch');
  if (config.oauth.spotify.clientId) enabled.push('spotify');
  if (config.oauth.linkedin.clientId) enabled.push('linkedin');
  if (config.oauth.gitlab.clientId) enabled.push('gitlab');
  if (config.oauth.slack.clientId) enabled.push('slack');
  if (config.oauth.steam.apiKey) enabled.push('steam');
  return enabled;
}
