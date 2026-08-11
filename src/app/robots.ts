import type { MetadataRoute } from 'next';
import { operationalRobotsRoute } from '@/lib/seo/operational-indexing';

export default function robots(): MetadataRoute.Robots {
  return operationalRobotsRoute();
}
