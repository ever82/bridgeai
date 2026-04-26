/**
 * LocationPicker Component (API-driven)
 * 省市区三级联动选择器 - 从 API 获取数据
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Location } from '@bridgeai/shared';

import { getProvinces, getCitiesByProvince, getDistrictsByCity } from '../../services/location';

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
  const [data, setData] = useState<LocationOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load provinces on mount
  useEffect(() => {
    if (modalVisible && data.length === 0 && step === 'province') {
      loadProvinces();
    }
  }, [modalVisible, step]);

  const loadProvinces = async () => {
    setLoading(true);
    setError(null);
    try {
      const provinces = await getProvinces();
      setData(provinces.map(p => ({ code: p.code, name: p.name })));
    } catch (e) {
      setError('加载省份失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (provinceCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const cities = await getCitiesByProvince(provinceCode);
      setData(cities.map(c => ({ code: c.code, name: c.name })));
    } catch (e) {
      setError('加载城市失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async (cityCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const districts = await getDistrictsByCity(cityCode);
      setData(districts.map(d => ({ code: d.code, name: d.name })));
    } catch (e) {
      setError('加载区县失败');
    } finally {
      setLoading(false);
    }
  };

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
    setData([]);
    setError(null);
    setModalVisible(true);
  };

  const handleSelectProvince = (province: LocationOption) => {
    setSelectedProvince(province);
    loadCities(province.code).then(() => setStep('city'));
  };

  const handleSelectCity = (city: LocationOption) => {
    setSelectedCity(city);
    loadDistricts(city.code).then(() => setStep('district'));
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
    setError(null);
    if (step === 'district') {
      setStep('city');
      if (selectedCity) {
        loadDistricts(selectedCity.code);
      }
    } else if (step === 'city') {
      setStep('province');
      setSelectedProvince(null);
    }
  };

  const handleClose = () => {
    setModalVisible(false);
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
        <Text style={[styles.text, !value && styles.placeholder]}>{getDisplayText()}</Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={handleClose}>
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
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressBar}>
              <View style={[styles.progressStep, styles.progressActive]} />
              <View style={[styles.progressStep, step !== 'province' && styles.progressActive]} />
              <View style={[styles.progressStep, step === 'district' && styles.progressActive]} />
            </View>

            {/* Selection path */}
            {(selectedProvince || selectedCity) && (
              <View style={styles.pathContainer}>
                {selectedProvince && <Text style={styles.pathText}>{selectedProvince.name}</Text>}
                {selectedCity && (
                  <>
                    <Text style={styles.pathSeparator}>→</Text>
                    <Text style={styles.pathText}>{selectedCity.name}</Text>
                  </>
                )}
              </View>
            )}

            {/* Content */}
            {loading ? (
              <ActivityIndicator style={styles.loader} />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    if (step === 'province') loadProvinces();
                    else if (step === 'city' && selectedProvince) loadCities(selectedProvince.code);
                    else if (step === 'district' && selectedCity) loadDistricts(selectedCity.code);
                  }}
                >
                  <Text style={styles.retryButtonText}>重试</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={data}
                keyExtractor={item => item.code}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={<Text style={styles.emptyText}>暂无数据</Text>}
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
  errorContainer: {
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
  },
});

export default LocationPicker;
