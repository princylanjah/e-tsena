import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
  colors?: readonly [string, string, ...string[]];
}

export const Logo = ({ size = 44, colors = ['#F97316', '#FB923C'] }: LogoProps) => {
  const c1 = colors[0] || '#F97316';
  const c2 = colors[1] || c1;
  const c3 = colors[2] || c2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c3} />
          </LinearGradient>
        </Defs>
        
        {/* Forme de panier stylisé et moderne (type E-tsena) */}
        <Path
          d="M17 18C15.8954 18 15 18.8954 15 20C15 21.1046 15.8954 22 17 22C18.1046 22 19 21.1046 19 20C19 18.8954 18.1046 18 17 18ZM1 2H4.27L5.21 4H20C20.55 4 21 4.45 21 5C21 5.17 20.95 5.34 20.88 5.48L17.3 11.97C16.96 12.58 16.3 13 15.55 13H8.1L7.2 14.63L7.17 14.75C7.17 14.89 7.28 15 7.42 15H19V17H7.42C6.32 17 5.42 16.1 5.42 15C5.42 14.7 5.49 14.42 5.61 14.17L6.62 12.35L3 4H1V2ZM7 18C5.89543 18 5 18.8954 5 20C5 21.1046 5.89543 22 7 22C8.10457 22 9 21.1046 9 20C9 18.8954 8.10457 18 7 18Z"
          fill="url(#logoGrad)"
        />
      </Svg>
    </View>
  );
};