/**
 * Verified Dhaka healthcare landmarks, tertiary hospitals, and major transit hubs.
 * Provides canonical reference coordinates for distance filtering, location presets, and testing.
 */

import type { Coordinates } from './types';

export interface DhakaLandmark {
  readonly id: string;
  readonly name: string;
  readonly nameBn: string;
  readonly category: 'hospital' | 'transit_hub' | 'civic_center';
  readonly coordinates: Coordinates;
  readonly area: string;
}

/**
 * Verified landmarks across Dhaka with exact WGS84 coordinates.
 */
export const DHAKA_LANDMARKS = {
  // Tertiary Hospitals & Diagnostic Hubs
  dmch: {
    id: 'dmch',
    name: 'Dhaka Medical College Hospital',
    nameBn: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
    category: 'hospital',
    coordinates: { latitude: 23.7259, longitude: 90.3976 },
    area: 'Bakshibazar / Shahbagh',
  },
  bsmmu: {
    id: 'bsmmu',
    name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)',
    nameBn: 'বঙ্গবন্ধু শেখ মুজিব মেডিকেল বিশ্ববিদ্যালয়',
    category: 'hospital',
    coordinates: { latitude: 23.7388, longitude: 90.3957 },
    area: 'Shahbagh',
  },
  evercare: {
    id: 'evercare',
    name: 'Evercare Hospital Dhaka',
    nameBn: 'এভারকেয়ার হাসপাতাল ঢাকা',
    category: 'hospital',
    coordinates: { latitude: 23.8103, longitude: 90.4312 },
    area: 'Bashundhara R/A',
  },
  squareHospital: {
    id: 'square-hospital',
    name: 'Square Hospital',
    nameBn: 'স্কয়ার হাসপাতাল',
    category: 'hospital',
    coordinates: { latitude: 23.7533, longitude: 90.3816 },
    area: 'Panthapath',
  },
  unitedHospital: {
    id: 'united-hospital',
    name: 'United Hospital',
    nameBn: 'ইউনাইটেড হাসপাতাল',
    category: 'hospital',
    coordinates: { latitude: 23.8055, longitude: 90.4158 },
    area: 'Gulshan-2',
  },
  popularDhanmondi: {
    id: 'popular-dhanmondi',
    name: 'Popular Diagnostic Centre - Dhanmondi',
    nameBn: 'পপুলার ডায়াগনস্টিক সেন্টার - ধানমন্ডি',
    category: 'hospital',
    coordinates: { latitude: 23.7431, longitude: 90.3824 },
    area: 'Dhanmondi',
  },
  ibnSinaDhanmondi: {
    id: 'ibn-sina-dhanmondi',
    name: 'Ibn Sina Diagnostic & Imaging Center - Dhanmondi',
    nameBn: 'ইবনে সিনা ডায়াগনস্টিক সেন্টার - ধানমন্ডি',
    category: 'hospital',
    coordinates: { latitude: 23.7465, longitude: 90.3732 },
    area: 'Dhanmondi',
  },
  ibnSinaBadda: {
    id: 'ibn-sina-badda',
    name: 'Ibn Sina Diagnostic Center - Badda',
    nameBn: 'ইবনে সিনা ডায়াগনস্টিক সেন্টার - বাড্ডা',
    category: 'hospital',
    coordinates: { latitude: 23.7844, longitude: 90.4262 },
    area: 'Middle Badda',
  },

  // Major Civic Centers & Transit Intersections
  shahbagh: {
    id: 'shahbagh-intersection',
    name: 'Shahbagh Intersection',
    nameBn: 'শাহবাগ মোড়',
    category: 'transit_hub',
    coordinates: { latitude: 23.7383, longitude: 90.3957 },
    area: 'Shahbagh',
  },
  farmgate: {
    id: 'farmgate-intersection',
    name: 'Farmgate Intersection',
    nameBn: 'ফার্মগেট মোড়',
    category: 'transit_hub',
    coordinates: { latitude: 23.7561, longitude: 90.3872 },
    area: 'Farmgate',
  },
  jatiyaSangsad: {
    id: 'jatiya-sangsad',
    name: 'Jatiya Sangsad Bhaban (National Parliament)',
    nameBn: 'জাতীয় সংসদ ভবন',
    category: 'civic_center',
    coordinates: { latitude: 23.7629, longitude: 90.3787 },
    area: 'Sher-e-Bangla Nagar',
  },
  gulshan2: {
    id: 'gulshan-2-circle',
    name: 'Gulshan-2 Circle',
    nameBn: 'গুলশান-২ চত্বর',
    category: 'transit_hub',
    coordinates: { latitude: 23.7949, longitude: 90.4143 },
    area: 'Gulshan-2',
  },
  uttaraHouseBuilding: {
    id: 'uttara-house-building',
    name: 'Uttara House Building',
    nameBn: 'উত্তরা হাউস বিল্ডিং',
    category: 'transit_hub',
    coordinates: { latitude: 23.8679, longitude: 90.3977 },
    area: 'Uttara Sector 7/9',
  },
  mirpur10: {
    id: 'mirpur-10-circle',
    name: 'Mirpur-10 Circle',
    nameBn: 'মিরপুর-১০ গোলচত্বর',
    category: 'transit_hub',
    coordinates: { latitude: 23.8069, longitude: 90.3687 },
    area: 'Mirpur-10',
  },
} as const;

export type DhakaLandmarkKey = keyof typeof DHAKA_LANDMARKS;
