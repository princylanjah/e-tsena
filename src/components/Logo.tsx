import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Rect } from 'react-native-svg';

interface LogoProps {
  size?: number;
  colors?: readonly [string, string, ...string[]];
  animated?: boolean;
}

export const Logo = ({ size = 44, colors = ['#FF5722', '#FF9800'], animated = false }: LogoProps) => {
  const c1 = colors[0] || '#FF5722';
  const c2 = colors[1] || '#FF9800';

  // Animation de respiration (scale)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated]);

  const AnimatedView = Animated.createAnimatedComponent(View);

  return (
    <AnimatedView style={{ width: size, height: size, transform: [{ scale: scaleAnim }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
          <LinearGradient id="gradLight" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#fff" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        
        <G>
          {/* Background Circle - subtle */}
          <Circle cx="50" cy="50" r="48" fill="url(#grad)" opacity="0.1" />
          
          {/* Panier moderne - corps principal */}
          <Path
            d="M22 35 L78 35 L72 70 C72 74 68 78 64 78 L36 78 C32 78 28 74 28 70 L22 35 Z"
            fill="url(#grad)"
          />
          
          {/* Poignée élégante */}
          <Path 
            d="M35 35 C35 22, 45 15, 50 15 C55 15, 65 22, 65 35" 
            stroke="url(#grad)" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Reflet blanc - effet 3D */}
          <Path 
            d="M26 40 L74 40 L70 65 C70 68, 67 70, 64 70 L58 70 L62 45 L30 45 L26 40 Z" 
            fill="url(#gradLight)" 
            opacity="0.5"
          />
          
          {/* Lignes horizontales - détails panier */}
          <Path d="M25 48 L75 48" stroke="#fff" strokeWidth="2" opacity="0.3" />
          <Path d="M27 58 L73 58" stroke="#fff" strokeWidth="2" opacity="0.25" />
          <Path d="M29 68 L71 68" stroke="#fff" strokeWidth="2" opacity="0.2" />
          
          {/* Petit accent - checkmark subtil */}
          <Circle cx="50" cy="55" r="12" fill="#fff" opacity="0.2" />
          <Path 
            d="M44 55 L48 59 L56 51" 
            stroke="#fff" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
        </G>
      </Svg>
    </AnimatedView>
  );
};