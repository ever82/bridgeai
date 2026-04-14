/**
 * Company Verification Screen
 *
 * Screen for company email verification and business license upload
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  VerificationStatus,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_COLORS,
} from '@bridgeai/shared';
import { JobStackParamList } from '../../types/navigation';

type CompanyVerificationScreenNavigationProp = NativeStackNavigationProp<JobStackParamList, 'CompanyVerification'>;

interface VerificationStepProps {
  number: number;
  title: string;
  status: 'pending' | 'active' | 'completed';
}

const VerificationStep: React.FC<VerificationStepProps> = ({ number, title, status }) => (
  <View style={styles.step}>
    <View style={[
      styles.stepCircle,
      status === 'completed' && styles.stepCircleCompleted,
      status === 'active' && styles.stepCircleActive,
    ]}>
      <Text style={[
        styles.stepNumber,
        (status === 'completed' || status === 'active') && styles.stepNumberActive,
      ]}>
        {status === 'completed' ? '✓' : number}
      </Text>
    </View>
    <Text style={[
      styles.stepTitle,
      status === 'active' && styles.stepTitleActive,
    ]}>{title}</Text>
  </View>
);

export const CompanyVerificationScreen: React.FC = () => {
  const navigation = useNavigation<CompanyVerificationScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [businessLicenseNumber, setBusinessLicenseNumber] = useState('');
  const [currentStep, setCurrentStep] = useState<'email' | 'business' | 'pending'>('email');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(VerificationStatus.UNVERIFIED);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendEmail = useCallback(async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('提示', '请输入有效的企业邮箱');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to send verification email
      // await api.post('/employers/verify-email', { email });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmailSent(true);
      Alert.alert('发送成功', '验证邮件已发送，请查收');
    } catch (error) {
      Alert.alert('发送失败', '请重试');
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const handleVerifyEmail = useCallback(async () => {
    if (!verificationCode) {
      Alert.alert('提示', '请输入验证码');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to verify email
      // await api.post('/employers/verify-email/confirm', { token: verificationCode });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setVerificationStatus(VerificationStatus.EMAIL_VERIFIED);
      setCurrentStep('business');
      Alert.alert('验证成功', '邮箱验证通过，请继续完成企业认证');
    } catch (error) {
      Alert.alert('验证失败', '验证码错误或已过期');
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode]);

  const handleSubmitBusiness = useCallback(async () => {
    if (!businessLicenseNumber) {
      Alert.alert('提示', '请输入营业执照注册号');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to submit business verification
      // await api.post('/employers/verify-business', {
      //   businessRegistrationNumber: businessLicenseNumber,
      //   businessLicenseUrl: 'temp-url',
      // });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setVerificationStatus(VerificationStatus.PENDING);
      setCurrentStep('pending');
      Alert.alert('提交成功', '审核提交成功，我们将在1-3个工作日内完成审核');
    } catch (error) {
      Alert.alert('提交失败', '请重试');
    } finally {
      setIsLoading(false);
    }
  }, [businessLicenseNumber]);

  const getStatusStep = () => {
    switch (verificationStatus) {
      case VerificationStatus.BUSINESS_VERIFIED:
        return { email: 'completed', business: 'completed' } as const;
      case VerificationStatus.EMAIL_VERIFIED:
      case VerificationStatus.PENDING:
        return { email: 'completed', business: currentStep === 'business' ? 'active' : 'pending' } as const;
      default:
        return { email: currentStep === 'email' ? 'active' : 'pending', business: 'pending' } as const;
    }
  };

  const steps = getStatusStep();
  const statusColor = VERIFICATION_STATUS_COLORS[verificationStatus];
  const statusLabel = VERIFICATION_STATUS_LABELS[verificationStatus];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>企业认证</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.statusDescription}>
            完成企业认证可以提升职位曝光度，获得更多求职者信任
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <VerificationStep number={1} title="邮箱认证" status={steps.email} />
          <View style={styles.stepLine} />
          <VerificationStep number={2} title="企业认证" status={steps.business} />
        </View>

        {/* Email Verification */}
        {currentStep === 'email' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>企业邮箱认证</Text>
            <Text style={styles.sectionDescription}>
              请使用企业域名邮箱进行验证，例如：hr@yourcompany.com
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>企业邮箱</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="请输入企业邮箱"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!emailSent}
              />
            </View>

            {!emailSent ? (
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSendEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>发送验证码</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>验证码</Text>
                  <TextInput
                    style={styles.input}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="请输入邮箱验证码"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                  onPress={handleVerifyEmail}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>验证邮箱</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSendEmail} disabled={isLoading}>
                  <Text style={styles.resendText}>重新发送验证码</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Business Verification */}
        {currentStep === 'business' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>企业资质认证</Text>
            <Text style={styles.sectionDescription}>
              请上传营业执照完成企业认证，仅支持中国大陆企业
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>营业执照注册号 *</Text>
              <TextInput
                style={styles.input}
                value={businessLicenseNumber}
                onChangeText={setBusinessLicenseNumber}
                placeholder="请输入统一社会信用代码"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>营业执照照片 *</Text>
              <TouchableOpacity style={styles.uploadArea}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>点击上传营业执照</Text>
                <Text style={styles.uploadHint}>支持 JPG、PNG 格式，文件大小不超过 5MB</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSubmitBusiness}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>提交审核</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Review */}
        {currentStep === 'pending' && (
          <View style={styles.section}>
            <View style={styles.pendingContainer}>
              <Text style={styles.pendingIcon}>⏳</Text>
              <Text style={styles.pendingTitle}>审核中</Text>
              <Text style={styles.pendingDescription}>
                您的企业认证申请已提交，我们的工作人员将在1-3个工作日内完成审核，请耐心等待
              </Text>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingInfoTitle}>审核进度</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '60%' }]} />
                </View>
                <Text style={styles.progressText}>资料审核中</Text>
              </View>
            </View>
          </View>
        )}

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>认证权益</Text>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>企业认证标识，提升信任度</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>职位优先展示，增加曝光</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>专属客服支持</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  step: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2196F3',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepTitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  stepTitleActive: {
    color: '#2196F3',
    fontWeight: '500',
  },
  stepLine: {
    width: 80,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  submitBtn: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    fontSize: 14,
    color: '#2196F3',
    textAlign: 'center',
    marginTop: 16,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 40,
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
  },
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pendingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  pendingDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  pendingInfo: {
    width: '100%',
  },
  pendingInfoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  benefitsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
  },
});

export default CompanyVerificationScreen;
