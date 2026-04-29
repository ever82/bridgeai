/**
 * Location Reference Data
 * 地理位置参考数据 - 省市区及地址数据库
 *
 * Development fallback data. In production, replace with:
 * - 高德/百度地图 API for geocoding
 * - Database table for administrative divisions
 */
export const PROVINCES = [
    { code: '110000', name: '北京市' },
    { code: '310000', name: '上海市' },
    { code: '440000', name: '广东省' },
    { code: '320000', name: '江苏省' },
    { code: '330000', name: '浙江省' },
    { code: '510000', name: '四川省' },
    { code: '420000', name: '湖北省' },
    { code: '610000', name: '陕西省' },
];
export const CITIES = [
    { code: '110100', name: '北京市', provinceCode: '110000' },
    { code: '310100', name: '上海市', provinceCode: '310000' },
    { code: '440100', name: '广州市', provinceCode: '440000' },
    { code: '440300', name: '深圳市', provinceCode: '440000' },
    { code: '320100', name: '南京市', provinceCode: '320000' },
    { code: '320500', name: '苏州市', provinceCode: '320000' },
    { code: '330100', name: '杭州市', provinceCode: '330000' },
    { code: '510100', name: '成都市', provinceCode: '510000' },
    { code: '420100', name: '武汉市', provinceCode: '420000' },
    { code: '610100', name: '西安市', provinceCode: '610000' },
];
export const DISTRICTS = [
    { code: '110101', name: '东城区', cityCode: '110100', provinceCode: '110000' },
    { code: '110102', name: '西城区', cityCode: '110100', provinceCode: '110000' },
    { code: '110105', name: '朝阳区', cityCode: '110100', provinceCode: '110000' },
    { code: '440103', name: '荔湾区', cityCode: '440100', provinceCode: '440000' },
    { code: '440104', name: '越秀区', cityCode: '440100', provinceCode: '440000' },
    { code: '440305', name: '南山区', cityCode: '440300', provinceCode: '440000' },
    { code: '440306', name: '宝安区', cityCode: '440300', provinceCode: '440000' },
];
export const ADDRESS_DATABASE = [
    {
        address: '北京市朝阳区建国路',
        location: {
            province: '110000',
            provinceName: '北京市',
            city: '110100',
            cityName: '北京市',
            district: '110105',
            districtName: '朝阳区',
            address: '建国路',
        },
        coordinates: { latitude: 39.9088, longitude: 116.3975 },
    },
    {
        address: '上海市浦东新区陆家嘴',
        location: {
            province: '310000',
            provinceName: '上海市',
            city: '310100',
            cityName: '上海市',
            district: '310115',
            districtName: '浦东新区',
            address: '陆家嘴',
        },
        coordinates: { latitude: 31.2304, longitude: 121.4737 },
    },
    {
        address: '广州市天河区珠江新城',
        location: {
            province: '440000',
            provinceName: '广东省',
            city: '440100',
            cityName: '广州市',
            district: '440106',
            districtName: '天河区',
            address: '珠江新城',
        },
        coordinates: { latitude: 23.1196, longitude: 113.3223 },
    },
    {
        address: '深圳市南山区科技园',
        location: {
            province: '440000',
            provinceName: '广东省',
            city: '440300',
            cityName: '深圳市',
            district: '440305',
            districtName: '南山区',
            address: '科技园',
        },
        coordinates: { latitude: 22.5312, longitude: 113.9288 },
    },
    {
        address: '杭州市西湖区武林广场',
        location: {
            province: '330000',
            provinceName: '浙江省',
            city: '330100',
            cityName: '杭州市',
            district: '330102',
            districtName: '西湖区',
            address: '武林广场',
        },
        coordinates: { latitude: 30.2489, longitude: 120.1655 },
    },
];
//# sourceMappingURL=locationData.js.map