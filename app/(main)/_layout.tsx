// ──────────────────────────────────────────────
// NafAcademy – Main Workspace Layout (Drawer)
// ──────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Slot, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { ChildSwitcherProvider } from '@/hooks/useChildSwitcher';
import { Sidebar } from '@/components';
import ChildSwitcherBar from '@/components/ChildSwitcherBar';
import { COLORS } from '@/constants';

const DRAWER_WIDTH = 280;

export default function MainLayout() {
  const { profile, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const closeDrawer = useCallback(() => {
    Animated.timing(translateX, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }, [translateX]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ChildSwitcherProvider>
      <View style={styles.root}>
        {/* ── Main content ──────────────────────── */}
        <View style={[styles.content, { paddingTop: insets.top }]}>        
          {/* Top bar with hamburger */}
          <View style={styles.topBar}>
            <Pressable onPress={openDrawer} hitSlop={12}>
              <Ionicons name="menu" size={28} color={COLORS.text} />
            </Pressable>
            <View style={styles.topBarTitle} />
          </View>
          {/* Parent child-switcher bar */}
          <ChildSwitcherBar />
          <Slot />
        </View>

        {/* ── Drawer overlay ────────────────────── */}
        {drawerOpen && (
          <Pressable style={styles.overlay} onPress={closeDrawer} />
        )}

        {/* ── Animated sidebar ──────────────────── */}
        <Animated.View
          style={[
            styles.drawer,
            { width: DRAWER_WIDTH, transform: [{ translateX }] },
          ]}
        >
          <Sidebar onClose={closeDrawer} />
        </Animated.View>
      </View>
    </ChildSwitcherProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarTitle: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
  },
});
