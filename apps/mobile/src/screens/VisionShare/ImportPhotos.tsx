import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { VisionShareStackParamList } from '../../navigation/types';
import { PhotoPicker, AlbumPhoto } from '../../components/PhotoPicker/PhotoPicker';

type ImportPhotosScreenNavigationProp = NativeStackNavigationProp<
  VisionShareStackParamList,
  'ImportPhotos'
>;

type ImportPhotosScreenRouteProp = RouteProp<VisionShareStackParamList, 'ImportPhotos'>;

export const ImportPhotosScreen: React.FC = () => {
  const navigation = useNavigation<ImportPhotosScreenNavigationProp>();
  const route = useRoute<ImportPhotosScreenRouteProp>();
  const { taskId, maxPhotos = 10, fromScreen } = route.params || {};

  const handleSelect = useCallback((photos: AlbumPhoto[]) => {
    // Navigate to PhotoEdit screen with imported photos
    navigation.navigate('PhotoEdit', {
      photos: photos.map((p) => ({
        uri: p.uri,
        width: p.width,
        height: p.height,
        timestamp: p.timestamp,
      })),
      taskId,
      fromScreen,
    });
  }, [navigation, taskId, fromScreen]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <PhotoPicker
        onSelect={handleSelect}
        onCancel={handleCancel}
        maxPhotos={maxPhotos}
        enableSecurityCheck={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default ImportPhotosScreen;
