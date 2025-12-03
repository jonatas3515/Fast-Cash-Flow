import React from 'react';
import { Rect, Svg } from 'react-native-svg';
import { Platform, TouchableOpacity, View } from 'react-native';

interface InteractiveBarProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  onPress?: () => void;
  onHover?: (isHovering: boolean) => void;
  children?: React.ReactNode;
}

export const InteractiveBar: React.FC<InteractiveBarProps> = ({
  x,
  y,
  width,
  height,
  fill,
  onPress,
  onHover,
  children
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseEnter = () => {
    if (Platform.OS === 'web') {
      setIsHovered(true);
      onHover?.(true);
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === 'web') {
      setIsHovered(false);
      onHover?.(false);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Para web, adicionamos eventos de mouse
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity onPress={handlePress}>
        <Svg>
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill}
            opacity={isHovered ? 0.8 : 1}
          />
        </Svg>
        {children}
      </TouchableOpacity>
    );
  }

  // Para mobile, Rect sem eventos (click será tratado no nível do ScrollView)
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
    />
  );
};

interface InteractiveChartProps {
  width: number;
  height: number;
  children: React.ReactNode;
  onPress?: () => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  width,
  height,
  children,
  onPress
}) => {
  if (Platform.OS === 'web') {
    return (
      <Svg width={width} height={height}>
        {children}
      </Svg>
    );
  }

  // Para mobile, envolvemos com TouchableOpacity
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Svg width={width} height={height}>
        {children}
      </Svg>
    </TouchableOpacity>
  );
};
