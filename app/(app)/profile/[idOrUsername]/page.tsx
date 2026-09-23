import type { Metadata } from 'next';
import { getSessionState, fetchAsCaller } from '../../../../lib/session';
import { PermissionDenied, ErrorState } from '../../../../components/data-table/states';
import { ProfileClient, type ProfileData } from '../profile-client';

export const metadata: Metadata = { title: 'User Profile — Claim Desk' };

interface ProfilePageProps {
  params: { idOrUsername: string };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
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

  const res = await fetchAsCaller(`/api/users/${params.idOrUsername}/profile`);
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl text-fg">Profile</h1>
        <ErrorState message="Failed to load requested profile." />
      </div>
    );
  }

  const profile: ProfileData = await res.json();
  const isSelf = session.user.id === profile.id || session.user.username === profile.username;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Profile</h1>
        <p className="text-xs text-fg-muted">
          Viewing profile for @{profile.username}.
        </p>
      </div>

      <ProfileClient initialProfile={profile} isSelf={isSelf} />
    </div>
  );
}
