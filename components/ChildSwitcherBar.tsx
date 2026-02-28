// ──────────────────────────────────────────────
// NafAcademy – Child Switcher Bar (for parents)
// Shows a horizontal pill bar to switch between children
// ──────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildSwitcher } from '@/hooks/useChildSwitcher';
import { getUser } from '@/services/firestore';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';
import type { AppUser } from '@/types';

/** Only renders content if the user is a parent with children */
export default function ChildSwitcherBar() {
  const { profile } = useAuth();
  const { activeChildId, childIds, switchChild, hasMultipleChildren, activeChild } = useChildSwitcher();
  const [childNames, setChildNames] = useState<Record<string, string>>({});

  // Fetch child names
  useEffect(() => {
    if (childIds.length === 0) return;
    Promise.all(childIds.map((cid) => getUser(cid))).then((profiles) => {
      const names: Record<string, string> = {};
      profiles.forEach((p) => {
        if (p) names[p.uid] = p.displayName;
      });
      setChildNames(names);
    });
  }, [childIds]);

  if (profile?.role !== 'parent' || childIds.length === 0) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
      <Text style={styles.label}>Viewing:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {childIds.map((cid) => {
          const isActive = cid === activeChildId;
          const name = childNames[cid] ?? `Child`;
          return (
            <Pressable
              key={cid}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => switchChild(cid)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 6, marginRight: 8 },
  pills: { gap: 6 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: { fontSize: 13, color: COLORS.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },
});
