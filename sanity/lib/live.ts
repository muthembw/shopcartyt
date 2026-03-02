// Querying with "sanityFetch" will keep content automatically updated
// Before using it, import and render "<SanityLive />" in your layout, see
// https://github.com/sanity-io/next-sanity#live-content-api for more information.
import { defineLive } from "next-sanity/live";
import { client } from "./client";

const serverToken =
  process.env.SANITY_API_READ_TOKEN ?? process.env.SANITY_API_TOKEN ?? false;
const browserToken = process.env.SANITY_API_READ_TOKEN ?? false;

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken,
  browserToken,
  fetchOptions: {
    revalidate: 0,
  },
});
