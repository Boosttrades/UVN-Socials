/**
 * Keyboard-aware scroll view that works in both Expo Go and native builds.
 * Uses React Native's built-in ScrollView — no native modules required.
 */
import { ScrollView, type ScrollViewProps } from 'react-native';

type Props = ScrollViewProps & {
  /** Accepted but ignored — kept for API compatibility with the old version */
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  ...props
}: Props) {
  return (
    <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
      {children}
    </ScrollView>
  );
}
