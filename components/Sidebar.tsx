// ──────────────────────────────────────────────
// NafAcademy – Custom Sidebar (Drawer)
// ──────────────────────────────────────────────
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SIDEBAR_ITEMS } from '@/constants';
import type { SidebarItem as SidebarItemType } from '@/types';

interface Props {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: Props) {
  const { profile, signOut, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Filter items by the current user's role
  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    profile ? item.roles.includes(profile.role) : false
  );

  const handleNavigate = (href: string) => {
    router.push(href as any);
    onClose?.();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      {/* ── Header / Profile ── */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person-circle-outline" size={48} color={COLORS.primary} />
          )}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {profile?.displayName ?? 'User'}
        </Text>
        <Text style={styles.role}>
          {profile?.role?.toUpperCase() ?? ''}
        </Text>
      </View>

      {/* ── Navigation Items ── */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href.replace('/(main)', ''));
          return (
            <TouchableOpacity
              key={item.href}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => handleNavigate(item.href)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon as any}
                size={22}
                color={active ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Footer / Sign-out ── */}
      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingTop: 48,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: { marginBottom: 8 },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  role: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 1,
  },
  nav: { flex: 1, marginTop: 8 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: `${COLORS.primary}12`,
  },
  navLabel: {
    marginLeft: 14,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  signOutText: {
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.error,
    fontWeight: '500',
  },
});
