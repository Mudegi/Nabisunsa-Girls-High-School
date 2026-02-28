// ──────────────────────────────────────────────
// NafAcademy – Career Path Screen
// ──────────────────────────────────────────────
import { RoleGate } from '@/components';
import CareerPathWorkspace from '@/components/CareerPathWorkspace';
import { useAuth } from '@/hooks/useAuth';

export default function CareerScreen() {
  const { profile } = useAuth();

  // Parents see their first child's career path; students see their own.
  const studentId =
    profile?.role === 'parent' && profile.childIds?.length
      ? profile.childIds[0]
      : undefined;

  return (
    <RoleGate allowed={['student', 'parent']}>
      <CareerPathWorkspace studentId={studentId} />
    </RoleGate>
  );
}
