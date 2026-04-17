import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Location } from '@bridgeai/shared';

interface LocationOption {
  code: string;
  name: string;
}

interface LocationPickerProps {
  value?: Location;
  onChange: (location: Location) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Mock data - in production, fetch from API
const PROVINCES: LocationOption[] = [
  { code: '110000', name: '北京市' },
  { code: '310000', name: '上海市' },
  { code: '440000', name: '广东省' },
  { code: '320000', name: '江苏省' },
  { code: '330000', name: '浙江省' },
];

const CITIES: Record<string, LocationOption[]> = {
  '110000': [{ code: '110100', name: '北京市' }],
  '310000': [{ code: '310100', name: '上海市' }],
  '440000': [
    { code: '440100', name: '广州市' },
    { code: '440300', name: '深圳市' },
  ],
  '320000': [
    { code: '320100', name: '南京市' },
    { code: '320500', name: '苏州市' },
  ],
  '330000': [{ code: '330100', name: '杭州市' }],
};

const DISTRICTS: Record<string, LocationOption[]> = {
  '110100': [
    { code: '110101', name: '东城区' },
    { code: '110102', name: '西城区' },
    { code: '110105', name: '朝阳区' },
  ],
  '310100': [
    { code: '310101', name: '黄浦区' },
    { code: '310104', name: '徐汇区' },
    { code: '310105', name: '长宁区' },
    { code: '310106', name: '静安区' },
  ],
  '440100': [
    { code: '440103', name: '荔湾区' },
    { code: '440104', name: '越秀区' },
    { code: '440105', name: '海珠区' },
  ],
  '440300': [
    { code: '440303', name: '罗湖区' },
    { code: '440304', name: '福田区' },
    { code: '440305', name: '南山区' },
  ],
  '320100': [
    { code: '320102', name: '玄武区' },
    { code: '320104', name: '秦淮区' },
    { code: '320105', name: '建邺区' },
  ],
  '320500': [
    { code: '320505', name: '虎丘区' },
    { code: '320506', name: '吴中区' },
  ],
  '330100': [
    { code: '330102', name: '上城区' },
    { code: '330103', name: '下城区' },
    { code: '330104', name: '江干区' },
  ],
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = '选择位置',
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'province' | 'city' | 'district'>('province');
  const [selectedProvince, setSelectedProvince] = useState<LocationOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
  const [loading, setLoading] = useState(false);

  const getDisplayText = () => {
    if (!value) return placeholder;
    const parts: string[] = [];
    if (value.provinceName) parts.push(value.provinceName);
    if (value.cityName) parts.push(value.cityName);
    if (value.districtName) parts.push(value.districtName);
    return parts.join(' - ') || placeholder;
  };

  const handleOpen = () => {
    if (disabled) return;
    setStep('province');
    setSelectedProvince(null);
    setSelectedCity(null);
    setModalVisible(true);
  };

  const handleSelectProvince = (province: LocationOption) => {
    setSelectedProvince(province);
    const cities = CITIES[province.code];
    if (cities && cities.length > 0) {
      setStep('city');
    } else {
      // No cities, complete with province only
      onChange({
        province: province.code,
        provinceName: province.name,
        city: '',
        cityName: '',
      });
      setModalVisible(false);
    }
  };

  const handleSelectCity = (city: LocationOption) => {
    setSelectedCity(city);
    const districts = DISTRICTS[city.code];
    if (districts && districts.length > 0) {
      setStep('district');
    } else {
      // No districts, complete with province and city
      onChange({
        province: selectedProvince!.code,
        provinceName: selectedProvince!.name,
        city: city.code,
        cityName: city.name,
      });
      setModalVisible(false);
    }
  };

  const handleSelectDistrict = (district: LocationOption) => {
    onChange({
      province: selectedProvince!.code,
      provinceName: selectedProvince!.name,
      city: selectedCity!.code,
      cityName: selectedCity!.name,
      district: district.code,
      districtName: district.name,
    });
    setModalVisible(false);
  };

  const handleBack = () => {
    if (step === 'district') {
      setStep('city');
      setSelectedCity(null);
    } else if (step === 'city') {
      setStep('province');
      setSelectedProvince(null);
    }
  };

  const renderItem = ({ item }: { item: LocationOption }) => (
    <TouchableOpacity
      style={styles.optionItem}
      onPress={() => {
        if (step === 'province') handleSelectProvince(item);
        else if (step === 'city') handleSelectCity(item);
        else handleSelectDistrict(item);
      }}
    >
      <Text style={styles.optionText}>{item.name}</Text>
      <Text style={styles.optionCode}>{item.code}</Text>
    </TouchableOpacity>
  );

  const getCurrentData = () => {
    if (step === 'province') return PROVINCES;
    if (step === 'city') return selectedProvince ? CITIES[selectedProvince.code] || [] : [];
    if (step === 'district') return selectedCity ? DISTRICTS[selectedCity.code] || [] : [];
    return [];
  };

  const getStepTitle = () => {
    if (step === 'province') return '选择省份';
    if (step === 'city') return `选择城市 (${selectedProvince?.name})`;
    return `选择区县 (${selectedCity?.name})`;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, disabled && styles.disabled]}
        onPress={handleOpen}
        disabled={disabled}
      >
        <Text style={[styles.text, !value && styles.placeholder]}>
          {getDisplayText()}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              {step !== 'province' && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.title}>{getStepTitle()}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressBar}>
              <View style={[styles.progressStep, styles.progressActive]} />
              <View
                style={[
                  styles.progressStep,
                  step !== 'province' && styles.progressActive,
                ]}
              />
              <View
                style={[
                  styles.progressStep,
                  step === 'district' && styles.progressActive,
                ]}
              />
            </View>

            {/* Selection path */}
            {(selectedProvince || selectedCity) && (
              <View style={styles.pathContainer}>
                {selectedProvince && (
                  <Text style={styles.pathText}>{selectedProvince.name}</Text>
                )}
                {selectedCity && (
                  <>
                    <Text style={styles.pathSeparator}>→</Text>
                    <Text style={styles.pathText}>{selectedCity.name}</Text>
                  </>
                )}
              </View>
            )}

            {/* List */}
            {loading ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              <FlatList
                data={getCurrentData()}
                keyExtractor={(item) => item.code}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  disabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
  },
  text: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  placeholder: {
    color: '#999',
  },
  arrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 20,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#007AFF',
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pathText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  pathSeparator: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 15,
    color: '#333',
  },
  optionCode: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 16,
  },
  loader: {
    marginVertical: 40,
  },
});

export default LocationPicker;
