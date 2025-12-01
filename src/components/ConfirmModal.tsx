import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  theme: any;
  isDarkMode: boolean;
}

const { width } = Dimensions.get('window');

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  type = 'danger',
  theme,
  isDarkMode
}) => {
  const isDanger = type === 'danger';
  const confirmColor = isDanger ? '#FF3B30' : theme.primary;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Background Blur Effect */}
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDarkMode ? 'dark' : 'light'} />
        
        <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
          
          {/* Icon Header */}
          <View style={[styles.iconContainer, { backgroundColor: isDanger ? '#FFE5E5' : theme.secondary }]}>
            <Ionicons 
              name={isDanger ? "trash-outline" : "information-circle-outline"} 
              size={32} 
              color={confirmColor} 
            />
          </View>

          {/* Content */}
          <Text style={[styles.title, { color: isDarkMode ? '#FFF' : '#000' }]}>{title}</Text>
          <Text style={[styles.message, { color: isDarkMode ? '#AAA' : '#666' }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { borderColor: isDarkMode ? '#333' : '#E5E5E5' }]} 
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: isDarkMode ? '#FFF' : '#333' }]}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: confirmColor }]} 
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, { color: '#FFF', fontWeight: '600' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
  },
});
