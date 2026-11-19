import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { CatalogRepository } from '../catalog/server/repository.server';
import type {
  LandingPageData,
  PopularServiceItem,
  CoveredHospitalItem,
  CoveredHospitalBranch,
} from '../catalog/contracts';

export type { LandingPageData, PopularServiceItem, CoveredHospitalItem, CoveredHospitalBranch };

export const readLandingData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<LandingPageData> => {
    if (!env?.DB) {
      return { popularServices: [], hospitals: [] };
    }
    return new CatalogRepository(env.DB).getLandingData();
  },
);
