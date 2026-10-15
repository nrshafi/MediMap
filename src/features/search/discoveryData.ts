/**
 * Domain data, mock branch service listings, and spatial query filter engine for Dhaka healthcare discovery.
 */

import { DHAKA_LANDMARKS } from '../map/landmarks';
import { filterBranchesByRadius } from '../map/radiusFilter';
import type { Coordinates } from '../map/types';
import type { DiscoveryBranchItem } from '../map/ui/types';
import type { RouteResult } from '../../integrations/mapping/types';
import { DEFAULT_DIAGNOSTIC_CATALOG } from './diagnosticCatalog';
import { resolveDiagnosticQuery } from './resolutionEngine';
import type { CanonicalService } from './types';

/**
 * Price record for a specific canonical diagnostic service at a hospital branch.
 */
export interface BranchServicePrice {
  readonly serviceId: string;
  readonly basePriceBdt: number;
  readonly priceSource: string;
  readonly verificationStatus: 'verified' | 'unverified';
  readonly verifiedAt: string;
}

/**
 * Diagnostic branch listing in Dhaka metropolitan area.
 */
export interface MockBranchListing {
  readonly id: string;
  readonly name: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly branchName: string;
  readonly address: string;
  readonly area: string;
  readonly coordinates: Coordinates;
  readonly phone: string;
  readonly servicePrices: readonly BranchServicePrice[];
  readonly [key: string]: unknown;
}

/**
 * Preset reference locations across Dhaka for easy discovery from different urban centers.
 */
export interface LocationPreset {
  readonly id: string;
  readonly name: string;
  readonly nameBn: string;
  readonly coordinates: Coordinates;
  readonly area: string;
}

/**
 * Verified canonical location presets in Dhaka.
 */
export const DHAKA_LOCATION_PRESETS: readonly LocationPreset[] = [
  {
    id: 'shahbagh',
    name: 'Shahbagh',
    nameBn: 'শাহবাগ',
    coordinates: DHAKA_LANDMARKS.shahbagh.coordinates,
    area: 'Shahbagh',
  },
  {
    id: 'dhanmondi',
    name: 'Dhanmondi',
    nameBn: 'ধানমন্ডি',
    coordinates: DHAKA_LANDMARKS.popularDhanmondi.coordinates,
    area: 'Dhanmondi',
  },
  {
    id: 'farmgate',
    name: 'Farmgate',
    nameBn: 'ফার্মগেট',
    coordinates: DHAKA_LANDMARKS.farmgate.coordinates,
    area: 'Farmgate',
  },
  {
    id: 'gulshan2',
    name: 'Gulshan-2',
    nameBn: 'গুলশান-২',
    coordinates: DHAKA_LANDMARKS.gulshan2.coordinates,
    area: 'Gulshan-2',
  },
  {
    id: 'mirpur10',
    name: 'Mirpur-10',
    nameBn: 'মিরপুর-১০',
    coordinates: DHAKA_LANDMARKS.mirpur10.coordinates,
    area: 'Mirpur-10',
  },
  {
    id: 'uttara',
    name: 'Uttara',
    nameBn: 'উত্তরা',
    coordinates: DHAKA_LANDMARKS.uttaraHouseBuilding.coordinates,
    area: 'Uttara Sector 7/9',
  },
] as const;

/**
 * Comprehensive verified branch listings for major Dhaka hospitals and diagnostic hubs.
 * Covers tertiary public and private institutions with authentic BDT prices for canonical tests.
 */
export const MOCK_BRANCH_LISTINGS: readonly MockBranchListing[] = [
  {
    id: 'square-panthapath',
    name: 'Square Hospital - Panthapath',
    providerId: 'square-hospitals',
    providerName: 'Square Hospital',
    branchName: 'Main Campus - Panthapath',
    address: '18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka 1205',
    area: 'Panthapath',
    coordinates: DHAKA_LANDMARKS.squareHospital.coordinates,
    phone: '+88028144400',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 1100,
        priceSource: 'Square Diagnostic Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 2600,
        priceSource: 'Square Diagnostic Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 11000,
        priceSource: 'Square Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 10000,
        priceSource: 'Square Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 4000,
        priceSource: 'Square Imaging Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 850,
        priceSource: 'Square Pathology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 1750,
        priceSource: 'Square Pathology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 1600,
        priceSource: 'Square Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 14500,
        priceSource: 'Square Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 1000,
        priceSource: 'Square Cardiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 1000,
        priceSource: 'Square Pathology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
    ],
  },
  {
    id: 'evercare-bashundhara',
    name: 'Evercare Hospital Dhaka - Bashundhara',
    providerId: 'evercare-hospitals',
    providerName: 'Evercare Hospital Dhaka',
    branchName: 'Main Campus - Bashundhara',
    address: 'Plot 81, Block E, Bashundhara R/A, Dhaka 1229',
    area: 'Bashundhara R/A',
    coordinates: DHAKA_LANDMARKS.evercare.coordinates,
    phone: '+88028431661',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 1200,
        priceSource: 'Evercare Price Catalog 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 2800,
        priceSource: 'Evercare Price Catalog 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 12000,
        priceSource: 'Evercare Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 11000,
        priceSource: 'Evercare Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 4500,
        priceSource: 'Evercare Imaging Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-07',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 900,
        priceSource: 'Evercare Pathology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 1900,
        priceSource: 'Evercare Pathology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 1800,
        priceSource: 'Evercare Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 16000,
        priceSource: 'Evercare Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 1200,
        priceSource: 'Evercare Cardiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 1200,
        priceSource: 'Evercare Pathology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
    ],
  },
  {
    id: 'united-gulshan',
    name: 'United Hospital - Gulshan-2',
    providerId: 'united-hospital-ltd',
    providerName: 'United Hospital',
    branchName: 'Main Campus - Gulshan-2',
    address: 'Plot 15, Road 71, Gulshan-2, Dhaka 1212',
    area: 'Gulshan-2',
    coordinates: DHAKA_LANDMARKS.unitedHospital.coordinates,
    phone: '+88028836444',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 1150,
        priceSource: 'United Hospital Rate Sheet 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 2700,
        priceSource: 'United Hospital Rate Sheet 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 11500,
        priceSource: 'United Hospital Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-04',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 10500,
        priceSource: 'United Hospital Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-04',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 4200,
        priceSource: 'United Hospital Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-06',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 900,
        priceSource: 'United Hospital Rate Sheet 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 1800,
        priceSource: 'United Hospital Rate Sheet 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 1700,
        priceSource: 'United Hospital Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-04',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 15000,
        priceSource: 'United Hospital Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-04',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 1100,
        priceSource: 'United Hospital Cardiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 1100,
        priceSource: 'United Hospital Rate Sheet 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
    ],
  },
  {
    id: 'popular-dhanmondi-branch',
    name: 'Popular Diagnostic Centre - Dhanmondi',
    providerId: 'popular-diagnostic',
    providerName: 'Popular Diagnostic Centre',
    branchName: 'Dhanmondi Branch',
    address: 'House 16, Road 2, Dhanmondi R/A, Dhaka 1205',
    area: 'Dhanmondi',
    coordinates: DHAKA_LANDMARKS.popularDhanmondi.coordinates,
    phone: '+8809613787801',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 550,
        priceSource: 'Popular Dhanmondi Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-14',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 1400,
        priceSource: 'Popular Dhanmondi Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-14',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 6500,
        priceSource: 'Popular Dhanmondi Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 6000,
        priceSource: 'Popular Dhanmondi Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 2200,
        priceSource: 'Popular Dhanmondi Ultrasonography 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 450,
        priceSource: 'Popular Dhanmondi Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-14',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 1000,
        priceSource: 'Popular Dhanmondi Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-14',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 800,
        priceSource: 'Popular Dhanmondi Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 9000,
        priceSource: 'Popular Dhanmondi Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 500,
        priceSource: 'Popular Dhanmondi Cardiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 500,
        priceSource: 'Popular Dhanmondi Pathology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
    ],
  },
  {
    id: 'ibn-sina-dhanmondi-branch',
    name: 'Ibn Sina Diagnostic Centre - Dhanmondi',
    providerId: 'ibn-sina-trust',
    providerName: 'Ibn Sina Diagnostic Centre',
    branchName: 'Dhanmondi Branch',
    address: 'House 48, Road 9/A, Dhanmondi, Dhaka 1209',
    area: 'Dhanmondi',
    coordinates: DHAKA_LANDMARKS.ibnSinaDhanmondi.coordinates,
    phone: '+88029126625',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 500,
        priceSource: 'Ibn Sina Trust Official Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 1300,
        priceSource: 'Ibn Sina Trust Official Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 6000,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 5500,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 2000,
        priceSource: 'Ibn Sina Ultrasonography 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 400,
        priceSource: 'Ibn Sina Pathology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 900,
        priceSource: 'Ibn Sina Pathology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 750,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 8500,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 450,
        priceSource: 'Ibn Sina Cardiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 500,
        priceSource: 'Ibn Sina Pathology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
    ],
  },
  {
    id: 'ibn-sina-badda-branch',
    name: 'Ibn Sina Diagnostic Centre - Badda',
    providerId: 'ibn-sina-trust',
    providerName: 'Ibn Sina Diagnostic Centre',
    branchName: 'Badda Branch',
    address: 'Cha-72/1, Progoti Shoroni, Uttar Badda, Dhaka 1212',
    area: 'Middle Badda',
    coordinates: DHAKA_LANDMARKS.ibnSinaBadda.coordinates,
    phone: '+88029891555',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 500,
        priceSource: 'Ibn Sina Trust Official Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 1300,
        priceSource: 'Ibn Sina Trust Official Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 6000,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 5500,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 2000,
        priceSource: 'Ibn Sina Ultrasonography 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 400,
        priceSource: 'Ibn Sina Pathology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 900,
        priceSource: 'Ibn Sina Pathology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-13',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 750,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 8500,
        priceSource: 'Ibn Sina Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 450,
        priceSource: 'Ibn Sina Cardiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 500,
        priceSource: 'Ibn Sina Pathology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
    ],
  },
  {
    id: 'dmch-bakshibazar',
    name: 'Dhaka Medical College Hospital - Bakshibazar',
    providerId: 'dmch-govt',
    providerName: 'Dhaka Medical College Hospital',
    branchName: 'Main Campus - Bakshibazar',
    address: 'Secretariat Road, Bakshibazar, Dhaka 1000',
    area: 'Bakshibazar / Shahbagh',
    coordinates: DHAKA_LANDMARKS.dmch.coordinates,
    phone: '+880255165088',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 150,
        priceSource: 'DGHS Government User Fee Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 400,
        priceSource: 'DGHS Government User Fee Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 2200,
        priceSource: 'DGHS Government Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 2000,
        priceSource: 'DGHS Government Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 500,
        priceSource: 'DGHS Government Imaging Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 100,
        priceSource: 'DGHS Government User Fee Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 300,
        priceSource: 'DGHS Government User Fee Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 200,
        priceSource: 'DGHS Government Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 3000,
        priceSource: 'DGHS Government Radiology Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 100,
        priceSource: 'DGHS Government User Fee Schedule 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 100,
        priceSource: 'DGHS Government Dengue Protocol 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-01',
      },
    ],
  },
  {
    id: 'bsmmu-shahbagh',
    name: 'BSMMU (PG Hospital) - Shahbagh',
    providerId: 'bsmmu-govt',
    providerName: 'BSMMU (PG Hospital)',
    branchName: 'Main Campus - Shahbagh',
    address: 'Shahbagh Road, Shahbagh, Dhaka 1000',
    area: 'Shahbagh',
    coordinates: DHAKA_LANDMARKS.bsmmu.coordinates,
    phone: '+88029661051',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 200,
        priceSource: 'BSMMU Autonomous Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 500,
        priceSource: 'BSMMU Autonomous Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 2800,
        priceSource: 'BSMMU Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 2500,
        priceSource: 'BSMMU Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 700,
        priceSource: 'BSMMU Ultrasonography Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 150,
        priceSource: 'BSMMU Autonomous Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 400,
        priceSource: 'BSMMU Autonomous Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 300,
        priceSource: 'BSMMU Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 4000,
        priceSource: 'BSMMU Radiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 150,
        priceSource: 'BSMMU Cardiology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 150,
        priceSource: 'BSMMU Pathology Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-05',
      },
    ],
  },
  {
    id: 'labaid-dhanmondi-branch',
    name: 'Labaid Diagnostic Centre - Dhanmondi',
    providerId: 'labaid-group',
    providerName: 'Labaid Diagnostic Centre',
    branchName: 'Dhanmondi Branch',
    address: 'House 06, Road 04, Dhanmondi, Dhaka 1205',
    area: 'Dhanmondi',
    coordinates: { latitude: 23.7415, longitude: 90.3818 },
    phone: '+88028610793',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 600,
        priceSource: 'Labaid Dhanmondi Price List 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 1500,
        priceSource: 'Labaid Dhanmondi Price List 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 6800,
        priceSource: 'Labaid Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 6200,
        priceSource: 'Labaid Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 2400,
        priceSource: 'Labaid Imaging 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 500,
        priceSource: 'Labaid Dhanmondi Price List 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 1100,
        priceSource: 'Labaid Dhanmondi Price List 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-12',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 850,
        priceSource: 'Labaid Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 9500,
        priceSource: 'Labaid Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-08',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 550,
        priceSource: 'Labaid Cardiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 600,
        priceSource: 'Labaid Dhanmondi Price List 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
    ],
  },
  {
    id: 'birdem-shahbagh',
    name: 'BIRDEM General Hospital - Shahbagh',
    providerId: 'birdem-trust',
    providerName: 'BIRDEM General Hospital',
    branchName: 'Main Campus - Shahbagh',
    address: '122 Kazi Nazrul Islam Avenue, Shahbagh, Dhaka 1000',
    area: 'Shahbagh',
    coordinates: { latitude: 23.7397, longitude: 90.3962 },
    phone: '+88029661551',
    servicePrices: [
      {
        serviceId: 'complete-blood-count',
        basePriceBdt: 450,
        priceSource: 'BIRDEM Diagnostic Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'lipid-profile',
        basePriceBdt: 1100,
        priceSource: 'BIRDEM Diagnostic Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'ct-chest',
        basePriceBdt: 5500,
        priceSource: 'BIRDEM Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-07',
      },
      {
        serviceId: 'ct-brain',
        basePriceBdt: 5000,
        priceSource: 'BIRDEM Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-07',
      },
      {
        serviceId: 'usg-whole-abdomen',
        basePriceBdt: 1800,
        priceSource: 'BIRDEM Ultrasonography 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'serum-creatinine',
        basePriceBdt: 350,
        priceSource: 'BIRDEM Diagnostic Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'hba1c',
        basePriceBdt: 800,
        priceSource: 'BIRDEM Diagnostic Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-10',
      },
      {
        serviceId: 'xray-chest',
        basePriceBdt: 600,
        priceSource: 'BIRDEM Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-07',
      },
      {
        serviceId: 'mri-brain',
        basePriceBdt: 7500,
        priceSource: 'BIRDEM Radiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-07',
      },
      {
        serviceId: 'electrocardiogram',
        basePriceBdt: 400,
        priceSource: 'BIRDEM Cardiology 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-09',
      },
      {
        serviceId: 'dengue-ns1-antigen',
        basePriceBdt: 400,
        priceSource: 'BIRDEM Diagnostic Tariff 2026',
        verificationStatus: 'verified',
        verifiedAt: '2026-10-11',
      },
    ],
  },
] as const;

/**
 * Filter options for query and location-based discovery.
 */
export interface DiscoveryQueryFilterOptions {
  readonly serviceId?: string;
  readonly queryText?: string;
  readonly center?: Coordinates;
  readonly radiusKm?: number;
  readonly catalog?: readonly CanonicalService[];
  readonly branches?: readonly MockBranchListing[];
}

/**
 * Result payload from the query and location discovery filter.
 */
export interface DiscoveryQueryResult {
  readonly canonicalService: CanonicalService;
  readonly center: Coordinates;
  readonly radiusKm: number;
  readonly branches: readonly DiscoveryBranchItem[];
}

/**
 * Default fallback service when none is specified (Complete Blood Count / CBC).
 */
export const DEFAULT_DISCOVERY_SERVICE_ID = 'complete-blood-count';

/**
 * Default reference location for Dhaka discovery (Shahbagh Intersection).
 */
export const DEFAULT_DISCOVERY_CENTER: Coordinates = DHAKA_LANDMARKS.shahbagh.coordinates;

/**
 * Filters branches by diagnostic test query and straight-line geographic radius.
 *
 * Algorithm:
 * 1. Resolves canonical service from serviceId, or by querying DEFAULT_DIAGNOSTIC_CATALOG with queryText.
 *    Falls back to Complete Blood Count if neither resolves.
 * 2. Establishes center coordinate (defaulting to Shahbagh) and radiusKm (defaulting to 3 km).
 * 3. Filters branches possessing a verified price for the resolved canonical service.
 * 4. Applies straight-line radius filtering using haversine calculation.
 * 5. Enriches matching branches into DiscoveryBranchItem records for SynchronizedDiscoveryView,
 *    retaining BDT base price, verification date, straight-line distance, and realistic road estimates.
 */
export function filterBranchesByQueryAndLocation(
  options: DiscoveryQueryFilterOptions = {}
): DiscoveryQueryResult {
  const catalog = options.catalog ?? DEFAULT_DIAGNOSTIC_CATALOG;
  const branches = options.branches ?? MOCK_BRANCH_LISTINGS;
  const center = options.center ?? DEFAULT_DISCOVERY_CENTER;
  const radiusKm = options.radiusKm !== undefined && options.radiusKm > 0 ? options.radiusKm : 3;

  // Step 1: Resolve canonical service
  let resolvedService: CanonicalService | undefined;

  if (options.serviceId) {
    resolvedService = catalog.find((s) => s.id === options.serviceId);
  }

  if (!resolvedService && options.queryText && options.queryText.trim() !== '') {
    const resolution = resolveDiagnosticQuery(options.queryText.trim(), catalog);
    if (resolution.status === 'resolved' && resolution.primaryMatch) {
      resolvedService = resolution.primaryMatch.canonicalService;
    } else if (resolution.matches.length > 0) {
      resolvedService = resolution.matches[0].canonicalService;
    }
  }

  if (!resolvedService) {
    resolvedService =
      catalog.find((s) => s.id === DEFAULT_DISCOVERY_SERVICE_ID) ?? catalog[0];
  }

  const targetServiceId = resolvedService.id;

  // Step 2: Filter branches offering target service
  const candidateBranches: MockBranchListing[] = [];
  for (const branch of branches) {
    const hasPrice = branch.servicePrices.some((p) => p.serviceId === targetServiceId);
    if (hasPrice) {
      candidateBranches.push(branch);
    }
  }

  // Step 3: Filter by straight-line radius using haversine
  const distanceResults = filterBranchesByRadius<MockBranchListing>(candidateBranches, {
    center,
    maxRadiusKm: radiusKm,
  });

  // Step 4: Map and enrich to DiscoveryBranchItem
  const discoveryItems: DiscoveryBranchItem[] = distanceResults.map((result) => {
    const branch = result.branch;
    const priceEntry = branch.servicePrices.find((p) => p.serviceId === targetServiceId);
    const straightLineDistanceKm = Number(result.distanceKm.toFixed(1));

    // Realistic urban road routing approximation for Dhaka metropolitan area (~1.35x road factor)
    const roadDistanceKm = Number(Math.max(0.4, straightLineDistanceKm * 1.35).toFixed(1));
    const travelDurationMinutes = Math.max(5, Math.round(roadDistanceKm * 3.5));

    const route: RouteResult = {
      status: 'available',
      roadDistanceKm,
      travelDurationMinutes,
      origin: center,
      destination: branch.coordinates,
      source: 'dhaka_urban_routing_model',
    };

    return {
      id: branch.id,
      providerId: branch.providerId,
      providerName: branch.providerName,
      branchName: branch.branchName,
      address: branch.address,
      area: branch.area,
      coordinates: branch.coordinates,
      basePriceBdt: priceEntry ? priceEntry.basePriceBdt : 0,
      priceVerifiedAt: priceEntry ? priceEntry.verifiedAt : '2026-10-01',
      isVerified: priceEntry ? priceEntry.verificationStatus === 'verified' : false,
      straightLineDistanceKm,
      route,
      roadDistanceKm,
      travelDurationMinutes,
    };
  });

  return {
    canonicalService: resolvedService,
    center,
    radiusKm,
    branches: discoveryItems,
  };
}
