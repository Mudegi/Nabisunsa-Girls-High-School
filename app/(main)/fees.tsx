// ──────────────────────────────────────────────
// NafAcademy – Fee Tracking Screen
// Admin creates fee records per student/term.
// Students & parents see their balance + payment
// history. Admin records payments.
// ──────────────────────────────────────────────
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useChildSwitcher } from '@/hooks/useChildSwitcher';
import {
  getFeesBySchool,
  getFeesByStudent,
  getTerms,
  getUsersByRole,
  createFeeRecord,
  addFeePayment,
  getFeePayments,
} from '@/services/firestore';
import { COLORS, SCHOOL_ID } from '@/constants';
import type { FeeRecord, FeePayment, Term, AppUser, FeeStatus } from '@/types';

const STATUS_COLOR: Record<FeeStatus, string> = {
  paid: COLORS.success,
  partial: COLORS.warning,
  unpaid: COLORS.error,
};

export default function FeesScreen() {
  const { profile, hasRole } = useAuth();
  const childSwitcher = useChildSwitcher();

  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);

  // Admin: create fee modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newTermId, setNewTermId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('Tuition');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFee, setPayFee] = useState<FeeRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);

  // Detail view
  const [detailFee, setDetailFee] = useState<FeeRecord | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const isAdmin = hasRole('admin');
  const isStudent = hasRole('student');
  const isParent = hasRole('parent');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getTerms(SCHOOL_ID);
      setTerms(t);

      if (isAdmin) {
        const [f, s] = await Promise.all([
          getFeesBySchool(SCHOOL_ID),
          getUsersByRole(SCHOOL_ID, 'student'),
        ]);
        setFees(f);
        setStudents(s);
      } else if (isStudent && profile) {
        const f = await getFeesByStudent(profile.uid);
        setFees(f);
      } else if (isParent && profile?.childIds?.length) {
        const childId = childSwitcher?.activeChildId ?? profile.childIds[0];
        const f = await getFeesByStudent(childId);
        setFees(f);
      }
    } catch (err) {
      console.warn('Fees load error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile, isAdmin, isStudent, isParent, childSwitcher?.activeChildId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Summary
  const totalDue = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.amountPaid, 0);
  const totalBalance = totalDue - totalPaid;

  const handleCreate = useCallback(async () => {
    if (!newStudentId || !newTermId || !newAmount) {
      Alert.alert('Validation', 'Student, term, and amount are required.');
      return;
    }
    const amount = parseInt(newAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Enter a valid amount.');
      return;
    }
    setCreating(true);
    try {
      const student = students.find((s) => s.uid === newStudentId);
      await createFeeRecord({
        schoolId: SCHOOL_ID,
        studentId: newStudentId,
        studentName: student?.displayName ?? '',
        termId: newTermId,
        amount,
        amountPaid: 0,
        status: 'unpaid',
        description: newDescription.trim() || 'Tuition',
        dueDate: newDueDate ? new Date(newDueDate).getTime() : Date.now() + 30 * 86400000,
        createdBy: profile!.uid,
        createdAt: Date.now(),
      });
      setShowCreateModal(false);
      setNewStudentId('');
      setNewTermId('');
      setNewAmount('');
      setNewDescription('Tuition');
      setNewDueDate('');
      refresh();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create fee record');
    } finally {
      setCreating(false);
    }
  }, [newStudentId, newTermId, newAmount, newDescription, newDueDate, students, profile, refresh]);

  const handlePay = useCallback(async () => {
    if (!payFee || !payAmount) return;
    const amount = parseInt(payAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Enter a valid amount.');
      return;
    }
    const remaining = payFee.amount - payFee.amountPaid;
    if (amount > remaining) {
      Alert.alert('Validation', `Amount exceeds balance of ${remaining.toLocaleString()} UGX.`);
      return;
    }
    setPaying(true);
    try {
      const newPaid = payFee.amountPaid + amount;
      const newStatus: FeeStatus = newPaid >= payFee.amount ? 'paid' : 'partial';
      await addFeePayment(
        payFee.id,
        {
          feeId: payFee.id,
          amount,
          method: payMethod,
          reference: payRef.trim() || undefined,
          recordedBy: profile!.uid,
          recordedByName: profile!.displayName,
          paidAt: Date.now(),
        },
        newPaid,
        newStatus
      );
      setShowPayModal(false);
      setPayFee(null);
      setPayAmount('');
      setPayRef('');
      refresh();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  }, [payFee, payAmount, payMethod, payRef, profile, refresh]);

  const openDetail = useCallback(async (fee: FeeRecord) => {
    setDetailFee(fee);
    setLoadingPayments(true);
    try {
      const p = await getFeePayments(fee.id);
      setPayments(p);
    } catch {
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const openPayModal = (fee: FeeRecord) => {
    setPayFee(fee);
    setPayAmount('');
    setPayRef('');
    setPayMethod('cash');
    setShowPayModal(true);
  };

  const termName = (id: string) => terms.find((t) => t.id === id)?.name ?? id;

  const formatMoney = (n: number) => `UGX ${n.toLocaleString()}`;
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  const renderFee = ({ item }: { item: FeeRecord }) => {
    const balance = item.amount - item.amountPaid;
    return (
      <Pressable style={styles.feeCard} onPress={() => openDetail(item)}>
        <View style={styles.feeCardRow}>
          <View style={styles.feeCardLeft}>
            <Text style={styles.feeStudent} numberOfLines={1}>{item.studentName}</Text>
            <Text style={styles.feeMeta}>{item.description} · {termName(item.termId)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.feeAmounts}>
          <View style={styles.feeAmountCol}>
            <Text style={styles.feeAmountLabel}>Due</Text>
            <Text style={styles.feeAmountValue}>{formatMoney(item.amount)}</Text>
          </View>
          <View style={styles.feeAmountCol}>
            <Text style={styles.feeAmountLabel}>Paid</Text>
            <Text style={[styles.feeAmountValue, { color: COLORS.success }]}>{formatMoney(item.amountPaid)}</Text>
          </View>
          <View style={styles.feeAmountCol}>
            <Text style={styles.feeAmountLabel}>Balance</Text>
            <Text style={[styles.feeAmountValue, { color: balance > 0 ? COLORS.error : COLORS.success }]}>
              {formatMoney(balance)}
            </Text>
          </View>
        </View>
        {isAdmin && balance > 0 && (
          <Pressable
            style={styles.recordPayBtn}
            onPress={(e) => { e.stopPropagation?.(); openPayModal(item); }}
          >
            <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
            <Text style={styles.recordPayBtnText}>Record Payment</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Fees</Text>
        {isAdmin && (
          <Pressable style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>New Fee</Text>
          </Pressable>
        )}
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.summaryNum}>{formatMoney(totalDue)}</Text>
          <Text style={styles.summaryLabel}>Total Due</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.summaryNum}>{formatMoney(totalPaid)}</Text>
          <Text style={styles.summaryLabel}>Total Paid</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: totalBalance > 0 ? '#FFEBEE' : '#E8F5E9' }]}>
          <Text style={styles.summaryNum}>{formatMoney(totalBalance)}</Text>
          <Text style={styles.summaryLabel}>Balance</Text>
        </View>
      </View>

      {/* Fee list */}
      {fees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No fee records yet</Text>
        </View>
      ) : (
        <FlatList
          data={fees}
          keyExtractor={(item) => item.id}
          renderItem={renderFee}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Create Fee Modal ── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={{ maxHeight: '85%', width: '90%' }} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={[styles.modal, { width: '100%' }]}>
              <Text style={styles.modalTitle}>Create Fee Record</Text>

              <Text style={styles.fieldLabel}>Term</Text>
              <View style={styles.pillRow}>
                {terms.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[styles.pill, newTermId === t.id && styles.pillActive]}
                    onPress={() => setNewTermId(t.id)}
                  >
                    <Text style={[styles.pillText, newTermId === t.id && styles.pillTextActive]}>
                      {t.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Student</Text>
              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                {students.map((s) => (
                  <Pressable
                    key={s.uid}
                    style={[styles.studentRow, newStudentId === s.uid && styles.studentRowActive]}
                    onPress={() => setNewStudentId(s.uid)}
                  >
                    <Text style={styles.studentName}>{s.displayName}</Text>
                    {newStudentId === s.uid && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Description (e.g. Tuition, Boarding)"
                value={newDescription}
                onChangeText={setNewDescription}
                placeholderTextColor={COLORS.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount (UGX)"
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Due date (YYYY-MM-DD, optional)"
                value={newDueDate}
                onChangeText={setNewDueDate}
                placeholderTextColor={COLORS.textSecondary}
              />

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, creating && { opacity: 0.5 }]}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Create</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Record Payment Modal ── */}
      <Modal visible={showPayModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            {payFee && (
              <Text style={styles.payContext}>
                {payFee.studentName} — Balance: {formatMoney(payFee.amount - payFee.amountPaid)}
              </Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Amount (UGX)"
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.pillRow}>
              {['cash', 'mobile_money', 'bank'].map((m) => (
                <Pressable
                  key={m}
                  style={[styles.pill, payMethod === m && styles.pillActive]}
                  onPress={() => setPayMethod(m)}
                >
                  <Text style={[styles.pillText, payMethod === m && styles.pillTextActive]}>
                    {m === 'mobile_money' ? 'Mobile Money' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Reference / receipt number (optional)"
              value={payRef}
              onChangeText={setPayRef}
              placeholderTextColor={COLORS.textSecondary}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowPayModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, paying && { opacity: 0.5 }]}
                onPress={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Submit Payment</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment History Modal ── */}
      <Modal visible={!!detailFee} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { width: '90%' }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.modalTitle}>Payment History</Text>
              <Pressable onPress={() => setDetailFee(null)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            {detailFee && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.detailName}>{detailFee.studentName}</Text>
                <Text style={styles.detailMeta}>
                  {detailFee.description} · {termName(detailFee.termId)}
                </Text>
                <Text style={styles.detailMeta}>
                  Due: {formatMoney(detailFee.amount)} · Paid: {formatMoney(detailFee.amountPaid)} · Balance: {formatMoney(detailFee.amount - detailFee.amountPaid)}
                </Text>
              </View>
            )}
            {loadingPayments ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : payments.length === 0 ? (
              <Text style={styles.emptyText}>No payments recorded yet.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {payments.map((p) => (
                  <View key={p.id} style={styles.paymentRow}>
                    <View style={styles.paymentLeft}>
                      <Text style={styles.paymentAmount}>{formatMoney(p.amount)}</Text>
                      <Text style={styles.paymentMeta}>
                        {p.method === 'mobile_money' ? 'Mobile Money' : p.method} · {formatDate(p.paidAt)}
                      </Text>
                      {p.reference ? <Text style={styles.paymentRef}>Ref: {p.reference}</Text> : null}
                    </View>
                    <Text style={styles.paymentBy}>{p.recordedByName}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryNum: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  summaryLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textTransform: 'uppercase' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  feeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  feeCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  feeCardLeft: { flex: 1 },
  feeStudent: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  feeMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  feeAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  feeAmountCol: { alignItems: 'center', flex: 1 },
  feeAmountLabel: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase' },
  feeAmountValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  recordPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  recordPayBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 12, color: COLORS.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  studentRowActive: { backgroundColor: COLORS.primary + '10' },
  studentName: { fontSize: 14, color: COLORS.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '600' },

  payContext: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },

  // Detail modal
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  detailMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  paymentLeft: { flex: 1 },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: COLORS.success },
  paymentMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  paymentRef: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic' },
  paymentBy: { fontSize: 12, color: COLORS.textSecondary },
});
