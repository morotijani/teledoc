import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/theme';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertAction {
  text: string;
  style?: 'primary' | 'destructive' | 'cancel';
  onPress?: () => void;
}

export interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  actions?: AlertAction[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
  hideAlert: () => {},
});

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [alertState, setAlertState] = useState<AlertOptions>({
    title: '',
    message: '',
    type: 'info',
    actions: [],
  });

  const slideAnim = useRef(new Animated.Value(320)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const showAlert = (options: AlertOptions) => {
    setAlertState({
      type: 'info',
      ...options,
      actions:
        options.actions && options.actions.length > 0
          ? options.actions
          : [{ text: 'OK', style: 'primary' }],
    });
    setVisible(true);
  };

  const hideAlert = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 320,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(320);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 68,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIconConfig = (type?: AlertType) => {
    switch (type) {
      case 'success':
        return {
          name: 'check-circle' as const,
          color: COLORS.success,
          bg: COLORS.successSoft,
        };
      case 'error':
        return {
          name: 'error-outline' as const,
          color: COLORS.danger,
          bg: COLORS.dangerSoft,
        };
      case 'warning':
        return {
          name: 'warning-amber' as const,
          color: COLORS.warning,
          bg: COLORS.warningSoft,
        };
      case 'confirm':
        return {
          name: 'help-outline' as const,
          color: COLORS.primary,
          bg: COLORS.primarySoft,
        };
      default:
        return {
          name: 'info-outline' as const,
          color: COLORS.info,
          bg: COLORS.infoSoft,
        };
    }
  };

  const iconCfg = getIconConfig(alertState.type);
  const actions = alertState.actions || [{ text: 'OK', style: 'primary' }];
  const cancelAction = actions.find((a) => a.style === 'cancel');

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert: () => hideAlert() }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => hideAlert(cancelAction?.onPress)}
      >
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={() => hideAlert(cancelAction?.onPress)}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Drag Handle Pill */}
            <View style={styles.handleBar} />

            {/* Semantic Icon Badge */}
            <View style={[styles.iconCircle, { backgroundColor: iconCfg.bg }]}>
              <MaterialIcons name={iconCfg.name} size={28} color={iconCfg.color} />
            </View>

            {/* Title & Message */}
            <Text style={styles.title}>{alertState.title}</Text>
            <Text style={styles.message}>{alertState.message}</Text>

            {/* Action Buttons */}
            <View
              style={[
                styles.actionsContainer,
                actions.length === 2 ? styles.actionsRow : styles.actionsColumn,
              ]}
            >
              {actions.map((action, idx) => {
                const isCancel = action.style === 'cancel';
                const isDestructive = action.style === 'destructive';
                return (
                  <TouchableOpacity
                    key={`${action.text}-${idx}`}
                    activeOpacity={0.85}
                    style={[
                      styles.actionBtn,
                      actions.length === 2 && { flex: 1 },
                      isCancel
                        ? styles.btnCancel
                        : isDestructive
                        ? styles.btnDestructive
                        : styles.btnPrimary,
                    ]}
                    onPress={() => hideAlert(action.onPress)}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        isCancel
                          ? styles.btnCancelText
                          : styles.btnSolidText,
                      ]}
                    >
                      {action.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 26,
    alignItems: 'center',
    minHeight: 280,
    ...SHADOWS.elevated,
  },
  handleBar: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.extraBold,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  actionBtn: {
    height: 50,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnDestructive: {
    backgroundColor: COLORS.danger,
  },
  btnCancel: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  btnSolidText: {
    color: COLORS.white,
  },
  btnCancelText: {
    color: COLORS.textSecondary,
  },
});
