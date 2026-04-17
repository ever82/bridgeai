import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { CreditLevel, CREDIT_LEVEL_THRESHOLDS } from '@bridgeai/shared';

interface CreditInsufficientProps {
  visible: boolean;
  currentScore: number | null;
  requiredScore: number;
  requiredLevel: CreditLevel;
  sceneName: string;
  onClose: () => void;
  onRequestTemporaryAccess?: () => void;
  onViewAlternatives?: () => void;
  onViewImprovementTips?: () => void;
}

const IMPROVEMENT_TIPS = [
  {
    icon: '✓',
    title: '完善个人资料',
    description: '填写完整的个人信息，上传真实头像',
    impact: '+50分',
  },
  {
    icon: '✓',
    title: '积累交易记录',
    description: '完成更多成功的交易，获得好评',
    impact: '+30分/次',
  },
  {
    icon: '✓',
    title: '保持活跃',
    description: '定期登录使用平台，参与社区互动',
    impact: '+10分/周',
  },
  {
    icon: '✓',
    title: '邀请好友',
    description: '邀请新用户注册并完成首次交易',
    impact: '+20分/人',
  },
  {
    icon: '✓',
    title: '实名认证',
    description: '完成身份认证和手机绑定',
    impact: '+100分',
  },
];

const ALTERNATIVE_SCENES = [
  { id: 'low_credit', name: '新手专区', description: '专为新用户设计的场景', minScore: 0 },
  { id: 'trial', name: '体验区', description: '低门槛体验模式', minScore: 200 },
  { id: 'community', name: '社区交流', description: '先参与社区互动', minScore: 300 },
];

export const CreditInsufficient: React.FC<CreditInsufficientProps> = ({
  visible,
  currentScore,
  requiredScore,
  requiredLevel,
  sceneName,
  onClose,
  onRequestTemporaryAccess,
  onViewAlternatives,
  onViewImprovementTips,
}) => {
  const [showTips, setShowTips] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const gap = requiredScore - (currentScore || 0);
  const currentLevel = getLevelFromScore(currentScore);
  const requiredLevelInfo = getLevelInfo(requiredLevel);

  const handleRequestSubmit = () => {
    if (requestReason.trim().length < 10) {
      return;
    }
    setRequestSubmitted(true);
    onRequestTemporaryAccess?.();
  };

  const renderMainContent = () => (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>
        <Text style={styles.title}>信用分不足</Text>
        <Text style={styles.subtitle}>
          您的信用分尚未达到 {sceneName} 的要求
        </Text>
      </View>

      {/* Score Comparison */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>当前信用分</Text>
            <Text style={[styles.scoreValue, styles.currentScore]}>
              {currentScore !== null ? currentScore : '无'}
            </Text>
            <Text style={styles.scoreLevel}>{getLevelInfo(currentLevel).label}</Text>
          </View>
          <View style={styles.scoreDivider}>
            <Text style={styles.arrow}>→</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>要求信用分</Text>
            <Text style={[styles.scoreValue, styles.requiredScore]}>
              {requiredScore}
            </Text>
            <Text style={[styles.scoreLevel, { color: requiredLevelInfo.color }]}>
              {requiredLevelInfo.label}
            </Text>
          </View>
        </View>
        <View style={styles.gapContainer}>
          <Text style={styles.gapText}>
            还需 {gap} 分才能使用该场景
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((currentScore || 0) / requiredScore * 100, 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            setShowTips(true);
            onViewImprovementTips?.();
          }}
        >
          <Text style={styles.actionIcon}>📈</Text>
          <Text style={styles.actionTitle}>提升信用分</Text>
          <Text style={styles.actionDesc}>查看如何快速提高信用分</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowAlternatives(true)}
        >
          <Text style={styles.actionIcon}>🎯</Text>
          <Text style={styles.actionTitle}>替代场景</Text>
          <Text style={styles.actionDesc}>查看当前可使用的场景</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowRequestForm(true)}
        >
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionTitle}>申请临时准入</Text>
          <Text style={styles.actionDesc}>提交申请获得临时访问权限</Text>
        </TouchableOpacity>
      </View>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>我知道了</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTipsContent = () => (
    <View style={styles.container}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>提升信用分</Text>
        <TouchableOpacity onPress={() => setShowTips(false)}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.tipsList}>
        {IMPROVEMENT_TIPS.map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <View style={styles.tipIconContainer}>
              <Text style={styles.tipIcon}>{tip.icon}</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDescription}>{tip.description}</Text>
            </View>
            <Text style={styles.tipImpact}>{tip.impact}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setShowTips(false)}
      >
        <Text style={styles.backButtonText}>返回</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAlternativesContent = () => (
    <View style={styles.container}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>可使用的替代场景</Text>
        <TouchableOpacity onPress={() => setShowAlternatives(false)}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.alternativesList}>
        {ALTERNATIVE_SCENES.map((scene) => (
          <TouchableOpacity
            key={scene.id}
            style={styles.alternativeItem}
            onPress={() => {
              onViewAlternatives?.();
            }}
          >
            <View style={styles.alternativeInfo}>
              <Text style={styles.alternativeName}>{scene.name}</Text>
              <Text style={styles.alternativeDesc}>{scene.description}</Text>
            </View>
            <View style={styles.alternativeScore}>
              <Text style={styles.alternativeScoreLabel}>最低要求</Text>
              <Text style={styles.alternativeScoreValue}>{scene.minScore}分</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setShowAlternatives(false)}
      >
        <Text style={styles.backButtonText}>返回</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequestForm = () => (
    <View style={styles.container}>
      {!requestSubmitted ? (
        <>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>申请临时准入</Text>
            <TouchableOpacity onPress={() => setShowRequestForm(false)}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>申请理由</Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              placeholder="请详细说明您需要访问该场景的原因，以及您将如何维护良好的信用记录..."
              value={requestReason}
              onChangeText={setRequestReason}
              textAlignVertical="top"
            />
            <Text style={styles.formHint}>
              至少输入 10 个字符 ({requestReason.length}/10)
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                requestReason.trim().length < 10 && styles.submitButtonDisabled,
              ]}
              onPress={handleRequestSubmit}
              disabled={requestReason.trim().length < 10}
            >
              <Text style={styles.submitButtonText}>提交申请</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>申请已提交</Text>
          <Text style={styles.successMessage}>
            您的临时准入申请已提交审核，结果将通过消息通知您。
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowRequestForm(false);
              setRequestSubmitted(false);
              setRequestReason('');
            }}
          >
            <Text style={styles.backButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      )}

      {!requestSubmitted && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowRequestForm(false)}
        >
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {showTips
            ? renderTipsContent()
            : showAlternatives
            ? renderAlternativesContent()
            : showRequestForm
            ? renderRequestForm()
            : renderMainContent()}
        </View>
      </View>
    </Modal>
  );
};

// Helper functions
function getLevelFromScore(score: number | null): CreditLevel | null {
  if (score === null) return null;
  const levels: CreditLevel[] = ['excellent', 'good', 'average', 'poor'];
  for (const level of levels) {
    const threshold = CREDIT_LEVEL_THRESHOLDS[level];
    if (score >= threshold.min && score <= threshold.max) {
      return level;
    }
  }
  return null;
}

function getLevelInfo(level: CreditLevel | null): { label: string; color: string } {
  const info: Record<CreditLevel, { label: string; color: string }> = {
    excellent: { label: '优秀', color: '#4CAF50' },
    good: { label: '良好', color: '#8BC34A' },
    average: { label: '一般', color: '#FFC107' },
    poor: { label: '较差', color: '#FF5722' },
  };
  return level ? info[level] : { label: '无', color: '#999' };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  container: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentScore: {
    color: '#FF5722',
  },
  requiredScore: {
    color: '#4CAF50',
  },
  scoreLevel: {
    fontSize: 12,
    color: '#666',
  },
  scoreDivider: {
    paddingHorizontal: 16,
  },
  arrow: {
    fontSize: 20,
    color: '#999',
  },
  gapContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  gapText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeIcon: {
    fontSize: 20,
    color: '#999',
  },
  tipsList: {
    maxHeight: 300,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipIcon: {
    fontSize: 14,
    color: '#4CAF50',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: 12,
    color: '#999',
  },
  tipImpact: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  alternativesList: {
    maxHeight: 200,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  alternativeDesc: {
    fontSize: 13,
    color: '#999',
  },
  alternativeScore: {
    alignItems: 'flex-end',
  },
  alternativeScoreLabel: {
    fontSize: 11,
    color: '#999',
  },
  alternativeScoreValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#999',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    fontSize: 60,
    color: '#4CAF50',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default CreditInsufficient;
