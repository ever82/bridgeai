import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {
  Task,
  TaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
} from '@bridgeai/shared';

interface TaskStatusTrackerProps {
  task: Task;
  showTimeline?: boolean;
}

interface StatusStep {
  status: TaskStatus;
  label: string;
  timestamp?: Date;
  description: string;
}

export const TaskStatusTracker: React.FC<TaskStatusTrackerProps> = ({
  task,
  showTimeline = true,
}) => {
  const getStatusSteps = (): StatusStep[] => {
    const steps: StatusStep[] = [
      {
        status: 'pending',
        label: '任务发布',
        timestamp: task.publishTime,
        description: '任务已发布，等待接单',
      },
      {
        status: 'accepted',
        label: '已接单',
        timestamp: task.acceptedAt,
        description: `由 ${task.acceptorName || '您'} 接单`,
      },
      {
        status: 'in_progress',
        label: '进行中',
        timestamp: task.startedAt,
        description: '任务正在进行中',
      },
      {
        status: 'completed',
        label: '已完成',
        timestamp: task.completedAt,
        description: '任务已完成',
      },
    ];

    return steps;
  };

  const getCurrentStepIndex = (): number => {
    const statusOrder: TaskStatus[] = ['pending', 'accepted', 'in_progress', 'completed'];
    return statusOrder.indexOf(task.status);
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '';
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const steps = getStatusSteps();
  const currentStepIndex = getCurrentStepIndex();

  if (!showTimeline) {
    const statusLabel = TASK_STATUS_LABELS[task.status]?.zh || task.status;
    const statusColor = TASK_STATUS_COLORS[task.status] || '#8C8C8C';

    return (
      <View style={styles.badge}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={[styles.badgeText, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>任务进度</Text>
      <View style={styles.timeline}>
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <View key={step.status} style={styles.step}>
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    index < currentStepIndex && styles.connectorActive,
                  ]}
                />
              )}

              {/* Step Content */}
              <View style={styles.stepContent}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
                    isPending && styles.stepCirclePending,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.checkMark}>✓</Text>
                  ) : (
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  )}
                </View>

                <View style={styles.stepInfo}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCompleted && styles.stepLabelCompleted,
                      isCurrent && styles.stepLabelCurrent,
                      isPending && styles.stepLabelPending,
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text
                    style={[
                      styles.stepDescription,
                      isPending && styles.stepDescriptionPending,
                    ]}
                  >
                    {step.description}
                  </Text>
                  {step.timestamp && (
                    <Text style={styles.stepTime}>
                      {formatDate(step.timestamp)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Status colors mapping
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#8C8C8C',
  accepted: '#1890FF',
  in_progress: '#FAAD14',
  completed: '#52C41A',
  cancelled: '#FF4D4F',
  disputed: '#722ED1',
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  step: {
    position: 'relative',
    paddingBottom: 24,
  },
  connector: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: '100%',
    backgroundColor: '#E8E8E8',
  },
  connectorActive: {
    backgroundColor: '#52C41A',
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCircleCompleted: {
    backgroundColor: '#52C41A',
    borderColor: '#52C41A',
  },
  stepCircleCurrent: {
    backgroundColor: '#1890FF',
    borderColor: '#1890FF',
  },
  stepCirclePending: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D9D9D9',
  },
  stepNumber: {
    fontSize: 14,
    color: '#8C8C8C',
    fontWeight: '500',
  },
  checkMark: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  stepLabelCompleted: {
    color: '#52C41A',
  },
  stepLabelCurrent: {
    color: '#1890FF',
  },
  stepLabelPending: {
    color: '#8C8C8C',
  },
  stepDescription: {
    fontSize: 13,
    color: '#595959',
    marginBottom: 4,
  },
  stepDescriptionPending: {
    color: '#BFBFBF',
  },
  stepTime: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
