import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// 参与人接口
interface Participant {
  userId: string;
  nickname?: string;
  avatar?: string;
}

// 聊天房间接口
interface ChatRoom {
  id: string;
  participants: Participant[];
  inheritedContext?: {
    agentConversationSummary: string;
    recommendedTopics: string[];
    matchScore: number;
  };
  createdAt: string;
}

interface MatchSuccessScreenProps {
  route: {
    params: {
      referralId: string;
      chatRoomId: string;
      otherUserId: string;
      matchScore: number;
    };
  };
}

const MatchSuccessScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    referralId,
    chatRoomId,
    otherUserId,
    matchScore,
  } = route.params as {
    referralId: string;
    chatRoomId: string;
    otherUserId: string;
    matchScore: number;
  };

  // 动画值
  const scaleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0);
  const translateYAnim = new Animated.Value(50);

  useEffect(() => {
    // 播放成功动画
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // 进入聊天房间
  const enterChatRoom = () => {
    navigation.navigate('ChatRoom' as never, {
      roomId: chatRoomId,
      otherUserId,
    } as never);
  };

  // 返回首页
  const goHome = () => {
    navigation.navigate('Home' as never);
  };

  // 查看引荐历史
  const viewHistory = () => {
    navigation.navigate('ReferralHistory' as never);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 成功动画区域 */}
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.celebrationCircle,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </Animated.View>

        <Animated.View style={{ opacity: opacityAnim }}>
          <Text style={styles.successTitle}>匹配成功！</Text>
          <Text style={styles.successSubtitle}>
            恭喜，你们双方已同意交换联系方式
          </Text>
        </Animated.View>

        {/* 匹配分数 */}
        <Animated.View
          style={[
            styles.scoreContainer,
            { transform: [{ translateY: translateYAnim }] },
          ]}
        >
          <Text style={styles.scoreLabel}>匹配度</Text>
          <Text style={styles.scoreValue}>{matchScore}%</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${matchScore}%` }]} />
          </View>
        </Animated.View>
      </View>

      {/* 提示信息区域 */}
      <Animated.View
        style={[
          styles.infoContainer,
          { opacity: opacityAnim, transform: [{ translateY: translateYAnim }] },
        ]}
      >
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>🤖</Text>
          <Text style={styles.infoText}>
            Agent代理已退出，现在由真人接管对话
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>💬</Text>
          <Text style={styles.infoText}>
            你们的真人聊天房间已创建成功
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            聊天内容已加密，请放心交流
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>⚠️</Text>
          <Text style={styles.infoText}>
            安全提示：保护个人隐私，不要过早分享敏感信息
          </Text>
        </View>
      </Animated.View>

      {/* 推荐话题区域 */}
      <Animated.View
        style={[
          styles.topicsContainer,
          { opacity: opacityAnim, transform: [{ translateY: translateYAnim }] },
        ]}
      >
        <Text style={styles.topicsTitle}>推荐话题</Text>
        <Text style={styles.topicsSubtitle}>
          从以下话题开始你们的对话吧
        </Text>
        <View style={styles.topicsList}>
          {['音乐品味', '旅行经历', '美食推荐', '电影喜好', '未来规划'].map((topic, index) => (
            <View key={index} style={styles.topicBadge}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* 操作按钮区域 */}
      <Animated.View
        style={[
          styles.buttonContainer,
          { opacity: opacityAnim, transform: [{ translateY: translateYAnim }] },
        ]}
      >
        <TouchableOpacity
          style={styles.chatButton}
          onPress={enterChatRoom}
        >
          <Text style={styles.chatButtonText}>进入聊天房间</Text>
          <Text style={styles.chatButtonSubtext}>开始真人交流</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={viewHistory}
        >
          <Text style={styles.secondaryButtonText}>查看引荐历史</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          onPress={goHome}
        >
          <Text style={styles.textButtonText}>返回首页</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  successContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  celebrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  celebrationEmoji: {
    fontSize: 60,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  scoreContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  scoreBar: {
    width: 200,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  topicsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  topicsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  topicsSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  topicText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    margin: 16,
    marginBottom: 32,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  chatButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#666666',
    fontSize: 14,
  },
});

export default MatchSuccessScreen;
