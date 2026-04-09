import React from 'react';
import { TouchableOpacity, Text, View, FlatList, StyleSheet, ListRenderItem } from 'react-native';

export interface Item {
  id: string;
  title: string;
  description: string;
}

export interface ItemListProps {
  items: Item[];
  onItemPress?: (item: Item) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export const ItemList: React.FC<ItemListProps> = ({
  items,
  onItemPress,
  emptyMessage = 'No items found',
}) => {
  const renderItem: ListRenderItem<Item> = ({ item }) => (
    <TouchableOpacity
      testID={`item-${item.id}`}
      onPress={() => onItemPress?.(item)}
      style={styles.item}
    >
      <Text testID={`item-title-${item.id}`} style={styles.title}>{item.title}</Text>
      <Text testID={`item-description-${item.id}`} style={styles.description}>{item.description}</Text>
    </TouchableOpacity>
  );

  const keyExtractor = (item: Item) => item.id;

  if (items.length === 0) {
    return (
      <View testID="empty-state" style={styles.emptyState}>
        <Text testID="empty-message" style={styles.emptyMessage}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="item-list"
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#999',
  },
});
