import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { VisionShareCamera, PhotoCapture } from '../../components/Camera/VisionShareCamera';
import { VisionShareStackParamList } from '../../navigation/types';

type CameraScreenNavigationProp = NativeStackNavigationProp<
  VisionShareStackParamList,
  'Camera'
>;

type CameraScreenRouteProp = RouteProp<VisionShareStackParamList, 'Camera'>;

export const CameraScreen: React.FC = () => {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const route = useRoute<CameraScreenRouteProp>();
  const { taskId, maxPhotos = 10, fromScreen } = route.params || {};

  const handleCapture = useCallback((photos: PhotoCapture[]) => {
    if (photos.length === 0) {
      navigation.goBack();
      return;
    }

    // Navigate to photo edit screen with captured photos
    navigation.navigate('PhotoEdit', {
      photos,
      taskId,
      fromScreen,
    });
  }, [navigation, taskId, fromScreen]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <VisionShareCamera
        onCapture={handleCapture}
        onCancel={handleCancel}
        maxPhotos={maxPhotos}
        enableBurst={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default CameraScreen;
