export const routes = {
  landing: '/',
  login: '/auth/login',
  registerUser: '/auth/register',
  registerCreator: '/auth/register/super-user',
  home: '/home',
  creatorProfile: '/creators/:slug',
  channel: '/channels/:slug',
  channelSubscribe: '/channels/:slug/subscribe',
  post: '/posts/:postId',
  stream: '/streams/:streamId',
  wallet: '/wallet',
  promotions: '/creator/promotions'
} as const
