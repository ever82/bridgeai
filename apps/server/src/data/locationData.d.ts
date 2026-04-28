/**
 * Location Reference Data
 * 地理位置参考数据 - 省市区及地址数据库
 *
 * Development fallback data. In production, replace with:
 * - 高德/百度地图 API for geocoding
 * - Database table for administrative divisions
 */
import type { Location, GeoCoordinates } from '@bridgeai/shared';
export interface ProvinceData {
    code: string;
    name: string;
}
export interface CityData {
    code: string;
    name: string;
    provinceCode: string;
}
export interface DistrictData {
    code: string;
    name: string;
    cityCode: string;
    provinceCode: string;
}
export declare const PROVINCES: ProvinceData[];
export declare const CITIES: CityData[];
export declare const DISTRICTS: DistrictData[];
export interface AddressEntry {
    address: string;
    location: Location;
    coordinates: GeoCoordinates;
}
export declare const ADDRESS_DATABASE: AddressEntry[];
//# sourceMappingURL=locationData.d.ts.map