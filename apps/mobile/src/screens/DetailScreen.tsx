import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type DetailScreenParams = {
  itemId?: string;
  title?: string;
};

export type DetailScreenRouteProp = RouteProp<{ Detail: DetailScreenParams }, 'Detail'>;
export type DetailScreenNavigationProp = NativeStackNavigationProp<{
  Detail: DetailScreenParams;
  EditScreen: { itemId?: string };
}>;

export const DetailScreen: React.FC = () => {
  const navigation = useNavigation<DetailScreenNavigationProp>();
  const route = useRoute<DetailScreenRouteProp>();
  const { itemId, title } = route.params || {};

  useEffect(() => {
    if (title) {
      navigation.setOptions({ title });
    }
  }, [title, navigation]);

  return (
    <View testID="detail-screen" style={styles.container}>
      <Text testID="screen-title" style={styles.screenTitle}>Detail Screen</Text>
      <Text testID="item-id" style={styles.itemId}>{itemId || 'No ID'}</Text>

      <TouchableOpacity
        testID="navigate-button"
        onPress={() => navigation.navigate('EditScreen', { itemId })}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Edit Item</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="go-back-button"
        onPress={() => navigation.goBack()}
        style={[styles.button, styles.secondaryButton]}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#333',
  },
});
