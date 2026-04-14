/**
 * 移动端推送通知服务 (Mobile Push Notification Service)
 * Expo Push Token 管理、推送接收和处理
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 基础 URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// 推送令牌存储键
const PUSH_TOKEN_STORAGE_KEY = '@push_token';
const PUSH_TOKEN_REGISTERED_KEY = '@push_token_registered';

// 推送消息处理器类型
type NotificationHandler = (notification: Notifications.Notification) => void;

// 推送响应处理器类型
type NotificationResponseHandler = (response: Notifications.NotificationResponse) => void;

/**
 * 推送通知服务类
 */
class PushNotificationService {
  private token: string | null = null;
  private deviceId: string | null = null;
  private notificationHandler: NotificationHandler | null = null;
  private responseHandler: NotificationResponseHandler | null = null;
  private isInitialized = false;

  /**
   * 初始化推送通知服务
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // 配置通知行为
      await this.configureNotifications();

      // 请求权限
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Push notification permission denied');
        return false;
      }

      // 获取设备 ID
      this.deviceId = await this.getDeviceId();

      // 获取推送令牌
      this.token = await this.getExpoPushToken();

      // 设置通知处理器
      this.setupNotificationHandlers();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
      return false;
    }
  }

  /**
   * 配置通知行为
   */
  private async configureNotifications(): Promise<void> {
    // 设置通知处理器
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // 配置 Android 通知通道
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // 创建其他通知通道
      await Notifications.setNotificationChannelAsync('match', {
        name: '匹配通知',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync('message', {
        name: '消息通知',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync('system', {
        name: '系统通知',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  }

  /**
   * 请求推送权限
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * 获取权限状态
   */
  async getPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return Notifications.getPermissionsAsync();
  }

  /**
   * 获取 Expo Push Token
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      return tokenData.data;
    } catch (error) {
      console.error('Failed to get Expo push token:', error);
      return null;
    }
  }

  /**
   * 获取设备 ID
   */
  private async getDeviceId(): Promise<string> {
    // 尝试从存储中获取设备 ID
    let deviceId = await AsyncStorage.getItem('@device_id');

    if (!deviceId) {
      // 生成新的设备 ID
      deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('@device_id', deviceId);
    }

    return deviceId;
  }

  /**
   * 注册推送令牌到服务器
   */
  async registerToken(authToken: string): Promise<boolean> {
    if (!this.token) {
      console.log('No push token available');
      return false;
    }

    try {
      // 检查是否已经注册过相同的令牌
      const registeredToken = await AsyncStorage.getItem(PUSH_TOKEN_REGISTERED_KEY);
      if (registeredToken === this.token) {
        console.log('Push token already registered');
        return true;
      }

      const response = await fetch(
        `${API_BASE_URL}/notification-preferences/push-tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token: this.token,
            deviceId: this.deviceId,
            deviceType: Platform.OS,
            appVersion: Constants.expoConfig?.version,
            osVersion: Device.osVersion,
          }),
        }
      );

      if (response.ok) {
        // 保存已注册的令牌
        await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, this.token);
        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, this.token);
        console.log('Push token registered successfully');
        return true;
      } else {
        console.error('Failed to register push token:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  }

  /**
   * 取消注册推送令牌
   */
  async unregisterToken(authToken: string): Promise<boolean> {
    if (!this.token) {
      return true;
    }

    try {
      // 这里应该调用服务器 API 删除令牌
      // 暂时只清理本地存储
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(PUSH_TOKEN_REGISTERED_KEY);

      this.token = null;
      return true;
    } catch (error) {
      console.error('Error unregistering push token:', error);
      return false;
    }
  }

  /**
   * 设置通知处理器
   */
  private setupNotificationHandlers(): void {
    // 前台接收通知
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);

      // 更新应用角标
      this.updateBadgeCount();

      // 调用自定义处理器
      if (this.notificationHandler) {
        this.notificationHandler(notification);
      }
    });

    // 用户点击通知
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', response);

      // 清除角标
      this.setBadgeCount(0);

      // 调用自定义处理器
      if (this.responseHandler) {
        this.responseHandler(response);
      }

      // 处理通知点击跳转
      this.handleNotificationClick(response);
    });

    // 监听令牌更新
    Notifications.addPushTokenListener((tokenData) => {
      console.log('Push token updated:', tokenData.data);
      this.token = tokenData.data;
    });
  }

  /**
   * 处理通知点击
   */
  private handleNotificationClick(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;

    if (!data) return;

    // 根据通知类型处理跳转
    const { type, actionUrl, matchId, conversationId } = data;

    // 这里应该与导航系统集成
    // 例如：
    // if (matchId) {
    //   navigation.navigate('MatchDetail', { matchId });
    // } else if (conversationId) {
    //   navigation.navigate('Chat', { conversationId });
    // }

    console.log('Navigate to:', { type, actionUrl, matchId, conversationId });
  }

  /**
   * 设置自定义通知处理器
   */
  setNotificationHandler(handler: NotificationHandler): void {
    this.notificationHandler = handler;
  }

  /**
   * 设置自定义响应处理器
   */
  setResponseHandler(handler: NotificationResponseHandler): void {
    this.responseHandler = handler;
  }

  /**
   * 获取当前推送令牌
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 获取设备 ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * 更新角标数量
   */
  private async updateBadgeCount(): Promise<void> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      await Notifications.setBadgeCountAsync(count + 1);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * 设置角标数量
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * 获取角标数量
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * 清除所有通知
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * 安排本地通知
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: trigger || { seconds: 1 },
      });
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * 取消本地通知
   */
  async cancelLocalNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * 取消所有本地通知
   */
  async cancelAllLocalNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * 获取挂起的通知
   */
  async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }
}

// 导出单例
export const pushNotificationService = new PushNotificationService();

// 导出类型
export { NotificationHandler, NotificationResponseHandler };
export default pushNotificationService;
