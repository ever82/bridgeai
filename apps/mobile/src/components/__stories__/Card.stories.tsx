import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { Modal } from '../Modal/Modal';
import { theme } from '../../theme';

const CardStory = () => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Card Component</Text>

      <Text style={styles.sectionTitle}>Basic Card</Text>
      <Card>
        <Text style={styles.cardText}>
          This is a basic card with some content.
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Card with Title</Text>
      <Card title="Card Title" subtitle="Card subtitle">
        <Text style={styles.cardText}>
          This card has a title and subtitle.
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Pressable Card</Text>
      <Card
        pressable
        onPress={() => setModalVisible(true)}
        title="Pressable Card"
      >
        <Text style={styles.cardText}>
          This card can be pressed. Tap to open a modal!
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Elevated Card</Text>
      <Card variant="elevated" title="Elevated">
        <Text style={styles.cardText}>
          This card has more elevation shadow.
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Outlined Card</Text>
      <Card variant="outlined" title="Outlined">
        <Text style={styles.cardText}>
          This card has an outline border.
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Card with Footer</Text>
      <Card
        title="Card with Footer"
        footer={
          <View style={styles.footerContent}>
            <Button title="Cancel" onPress={() => {}} variant="text" size="sm" />
            <Button title="Confirm" onPress={() => {}} size="sm" />
          </View>
        }
      >
        <Text style={styles.cardText}>
          This card has action buttons in the footer.
        </Text>
      </Card>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Example Modal"
      >
        <Text style={styles.modalText}>
          This modal was opened from a pressable card!
        </Text>
        <Button title="Close" onPress={() => setModalVisible(false)} />
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.base,
  },
  title: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    marginBottom: theme.spacing.lg,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    color: theme.colors.textSecondary,
  },
  cardText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    lineHeight: theme.fonts.sizes.base * 1.5,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
});

export default CardStory;
