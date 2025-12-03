import { Platform } from 'react-native';

// Bridge file to satisfy TS resolver and Metro on all platforms
// Delegates to .native or .web implementations created alongside
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Comp = Platform.OS === 'web'
  ? require('./NativeDatePicker.web').default
  : require('./NativeDatePicker.native').default;

export default Comp;
