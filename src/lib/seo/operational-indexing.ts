import type { Metadata, MetadataRoute } from 'next';

export const OPERATIONAL_ROBOTS_METADATA: Metadata['robots'] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

export function operationalRobotsRoute(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Crawlers must be able to read the noindex directive on pages that are
      // already indexed. robots.txt is not an access-control mechanism.
      allow: '/',
    },
  };
}
