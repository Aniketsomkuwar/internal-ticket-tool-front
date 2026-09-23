import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../components/data-table/states';
import { ProfileClient, type ProfileData } from './profile-client';

export const metadata: Metadata = { title: 'My Profile — Claim Desk' };

export default async function MyProfilePage() {
  const session = await getSessionState();

  if (session.status === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Profile</h1>
        <ErrorState message="Could not connect to the API server." />
      </div>
    );
  }

  if (session.status === 'unauthenticated' || !session.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Profile</h1>
        <PermissionDenied requiredPermission="profile:read" />
      </div>
    );
  }

  const res = await fetchAsCaller(`/api/users/${session.user.id}/profile`);
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Profile</h1>
        <ErrorState message="Failed to load profile details." />
      </div>
    );
  }

  const profile: ProfileData = await res.json();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Profile</h1>
        <p className="text-xs text-fg-muted">
          Your personal details, contact info, and activity statistics.
        </p>
      </div>

      <ProfileClient initialProfile={profile} isSelf={true} />
    </div>
  );
}
