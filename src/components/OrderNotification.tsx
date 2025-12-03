import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface OrderNotificationProps {
  orderCount: number;
  nextOrderTime: string;
  onClose: () => void;
  theme: any;
}

export default function OrderNotification({ orderCount, nextOrderTime, onClose, theme }: OrderNotificationProps) {
  if (orderCount === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
      <View style={styles.content}>
        <Text style={[styles.icon, { fontSize: 20 }]}>⚠️</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: '#92400e' }]}>
            Encomenda para Amanhã!
          </Text>
          <Text style={[styles.message, { color: '#78350f' }]}>
            {orderCount === 1 
              ? `Você tem uma encomenda para amanhã às ${nextOrderTime}`
              : `Você tem ${orderCount} encomendas para amanhã, primeira às ${nextOrderTime}`
            }
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: '#92400e' }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
