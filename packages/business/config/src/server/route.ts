// set timeout to about 8 minutes, and give 2s padding time. Bumped from the
// upstream 5-minute default because image-to-image generation against slower
// providers regularly exceeds 5 min, surfacing as "task is timeout, please
// try again" to the user. Nginx's proxy_read_timeout is 600s, so 8 min stays
// under that ceiling.
export const ASYNC_TASK_TIMEOUT = (60 * 8 - 2) * 1000;

// // trpc routes max duration
// export const TRPC_ASYNC_MAX_DURATION: number | undefined = undefined;
// export const TRPC_TOOLS_MAX_DURATION: number | undefined = undefined;

// export const WEBAPI_CHAT_MAX_DURATION: number = 300;
// export const WEBAPI_PLUGIN_GATEWAY_MAX_DURATION: number | undefined = undefined;
