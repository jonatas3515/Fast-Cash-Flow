import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useThemeCtx } from '../theme/ThemeProvider';

interface ScrollbarStylesProps {
  children: React.ReactNode;
}

export const ScrollbarStyles: React.FC<ScrollbarStylesProps> = ({ children }) => {
  const { theme, mode } = useThemeCtx();

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Injetar estilos CSS para scrollbars
      const styleId = 'custom-scrollbar-styles';
      
      // Remover estilos anteriores se existirem
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }

      // Criar estilos CSS
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Scrollbar vertical */
        ::-webkit-scrollbar {
          width: 12px;
        }

        ::-webkit-scrollbar-track {
          background: ${theme.scrollbarTrack};
          border-radius: 6px;
        }

        ::-webkit-scrollbar-thumb {
          background: ${theme.scrollbarThumb};
          border-radius: 6px;
          border: 2px solid ${theme.scrollbarTrack};
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.scrollbarThumbHover};
        }

        /* Scrollbar horizontal */
        ::-webkit-scrollbar:horizontal {
          height: 12px;
        }

        ::-webkit-scrollbar-track:horizontal {
          background: ${theme.scrollbarTrack};
          border-radius: 6px;
        }

        ::-webkit-scrollbar-thumb:horizontal {
          background: ${theme.scrollbarThumb};
          border-radius: 6px;
          border: 2px solid ${theme.scrollbarTrack};
        }

        ::-webkit-scrollbar-thumb:horizontal:hover {
          background: ${theme.scrollbarThumbHover};
        }

        /* Firefox scrollbar */
        * {
          scrollbar-width: thin;
          scrollbar-color: ${theme.scrollbarThumb} ${theme.scrollbarTrack};
        }

        /* Scrollbar para elementos específicos - aplicado globalmente */
      `;

      // Adicionar ao head do documento
      document.head.appendChild(style);

      // Cleanup ao desmontar
      return () => {
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, [theme, mode]);

  return <>{children}</>;
};
