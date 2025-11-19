import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@constants/colors';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==================== GRADIENT CARD ====================
interface GradientCardProps {
  title: string;
  subtitle?: string;
  amount?: string | number;
  gradient: [string, string];
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  title,
  subtitle,
  amount,
  gradient,
  children,
  onPress,
  style
}) => {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={[styles.gradientCardContainer, style]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        <View style={styles.gradientCardHeader}>
          <Text style={styles.gradientCardTitle}>{title}</Text>
          {subtitle && <Text style={styles.gradientCardSubtitle}>{subtitle}</Text>}
        </View>
        
        {amount && (
          <Text style={styles.gradientCardAmount}>{amount}</Text>
        )}
        
        {children}
      </LinearGradient>
    </Container>
  );
};

// ==================== ACTION BUTTON ====================
interface ActionButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: 'cyan' | 'coral';
  onPress: () => void;
  style?: ViewStyle;
  small?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon,
  color,
  onPress,
  style,
  small = false
}) => {
  const bgColor = color === 'cyan' ? COLORS.cyan : COLORS.coral;
  
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: bgColor },
        small && styles.actionButtonSmall,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={small ? 18 : 20} color="white" />
      <Text style={[styles.actionButtonText, small && styles.actionButtonTextSmall]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ==================== ICON CARD ====================
interface IconCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const IconCard: React.FC<IconCardProps> = ({
  icon,
  label,
  color,
  onPress,
  style
}) => {
  return (
    <TouchableOpacity
      style={[styles.iconCard, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCardCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text style={styles.iconCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// ==================== BREADCRUMB ====================
interface BreadcrumbProps {
  items: Array<{ label: string; route?: string }>;
  style?: ViewStyle;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, style }) => {
  return (
    <View style={[styles.breadcrumb, style]}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <Ionicons 
              name="chevron-forward" 
              size={14} 
              color={COLORS.textLight} 
              style={styles.breadcrumbSeparator}
            />
          )}
          <TouchableOpacity
            onPress={() => item.route && router.push(item.route as any)}
            disabled={!item.route || index === items.length - 1}
            activeOpacity={0.6}
          >
            <Text 
              style={[
                styles.breadcrumbItem,
                index === items.length - 1 && styles.breadcrumbItemActive
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
};

// ==================== MODERN HEADER ====================
interface ModernHeaderProps {
  title: string;
  subtitle?: string;
  gradient: [string, string];
  avatar?: boolean;
  rightButton?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  settingsButton?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  breadcrumb?: Array<{ label: string; route?: string }>;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  title,
  subtitle,
  gradient,
  avatar = false,
  rightButton,
  settingsButton,
  breadcrumb
}) => {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.modernHeader}
    >
      {breadcrumb && <Breadcrumb items={breadcrumb} style={styles.headerBreadcrumb} />}
      
      <View style={styles.modernHeaderContent}>
        <View style={styles.modernHeaderLeft}>
          {avatar && (
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          )}
          <View>
            {subtitle && <Text style={styles.modernHeaderSubtitle}>{subtitle}</Text>}
            <Text style={styles.modernHeaderTitle}>{title}</Text>
          </View>
        </View>
        
        <View style={styles.headerRightButtons}>
          {rightButton && (
            <TouchableOpacity 
              style={styles.headerRightButton}
              onPress={rightButton.onPress}
              activeOpacity={0.7}
            >
              <Ionicons name={rightButton.icon} size={24} color="white" />
            </TouchableOpacity>
          )}
          {settingsButton && (
            <TouchableOpacity 
              style={styles.headerRightButton}
              onPress={settingsButton.onPress}
              activeOpacity={0.7}
            >
              <Ionicons name={settingsButton.icon} size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

// ==================== STAT CARD ====================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  style
}) => {
  return (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
};

// ==================== MODERN CARD ====================
interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const ModernCard: React.FC<ModernCardProps> = ({ children, style, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      style={[styles.modernCard, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Container>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // Gradient Card
  gradientCardContainer: {
    marginBottom: 16,
  },
  gradientCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  gradientCardHeader: {
    marginBottom: 16,
  },
  gradientCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  gradientCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  gradientCardAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  
  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonTextSmall: {
    fontSize: 13,
  },
  
  // Icon Card
  iconCard: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 100,
  },
  iconCardCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  
  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  breadcrumbSeparator: {
    marginHorizontal: 6,
  },
  breadcrumbItem: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  breadcrumbItemActive: {
    color: 'white',
    fontWeight: '700',
  },
  
  // Modern Header
  modernHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerBreadcrumb: {
    marginBottom: 8,
  },
  modernHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  modernHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 2,
  },
  modernHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  headerRightButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stat Card
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  
  // Modern Card
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
});
