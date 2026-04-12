import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';

interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  options: SortOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  options,
  selected,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dropdown}>
              {options.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    selected === option.value && styles.selectedOption,
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected === option.value && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected === option.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
  },
  optionText: {
    fontSize: 15,
    color: '#333',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#1976D2',
  },
  checkmark: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold',
  },
});
