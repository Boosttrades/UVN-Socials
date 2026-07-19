import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageLightboxProps {
  visible: boolean;
  /** Array of image URIs to show. Paginate with prev/next arrows when multiple. */
  uris: string[];
  /** Which index to start on when opened. */
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageLightbox({
  visible,
  uris,
  initialIndex = 0,
  onClose,
}: ImageLightboxProps) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = React.useState(initialIndex);

  // Reset to the requested index whenever the lightbox opens.
  React.useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!visible || uris.length === 0) return null;

  const uri = uris[index];
  const hasMultiple = uris.length > 1;
  const closeTop = Platform.OS === 'web' ? 16 : insets.top + 8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: closeTop }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="Close image"
          accessibilityRole="button"
        >
          <Feather name="x" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Counter */}
        {hasMultiple && (
          <View style={[styles.counter, { top: closeTop + 4 }]}>
            <Text style={styles.counterText}>
              {index + 1} / {uris.length}
            </Text>
          </View>
        )}

        {/* Image */}
        <Pressable style={styles.imageWrap} onPress={onClose}>
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Pressable>

        {/* Prev / Next arrows */}
        {hasMultiple && (
          <>
            {index > 0 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navLeft]}
                onPress={() => setIndex((i) => i - 1)}
                hitSlop={12}
                accessibilityLabel="Previous image"
                accessibilityRole="button"
              >
                <Feather name="chevron-left" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {index < uris.length - 1 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navRight]}
                onPress={() => setIndex((i) => i + 1)}
                hitSlop={12}
                accessibilityLabel="Next image"
                accessibilityRole="button"
              >
                <Feather name="chevron-right" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    opacity: 0.85,
  },
  imageWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -22 }],
  },
  navLeft: { left: 12 },
  navRight: { right: 12 },
});
