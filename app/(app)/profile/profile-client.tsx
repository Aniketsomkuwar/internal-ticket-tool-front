'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS, PERMISSION_LABELS, type Role, type Permission } from '@/shared/index';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Alert } from '../../../components/ui/alert';
import { Field } from '../../../components/ui/field';

export interface ProfileData {
  id: string;
  email: string;
  username: string;
  role: Role;
  fullName: string;
  department: string;
  phone: string;
  bio: string;
  pictureUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  assignedProjectsCount: number;
  ticketsRaisedCount: number;
  ticketsResolvedCount: number;
  permissions?: readonly Permission[];
}

interface ProfileClientProps {
  initialProfile: ProfileData;
  isSelf: boolean;
}

export function ProfileClient({ initialProfile, isSelf }: ProfileClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [pictureUrl, setPictureUrl] = useState(initialProfile.pictureUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Change Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: base64Data,
            mimeType: file.type,
            filename: file.name,
          }),
        });

        if (!res.ok) throw new Error('Failed to upload image.');
        const result = await res.json();
        setPictureUrl(result.url);
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          pictureUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update profile');
      }

      const updated = await res.json();
      setProfile(updated);
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password.');
      }

      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {errorMsg ? (
        <Alert tone="error" title="Error">
          {errorMsg}
        </Alert>
      ) : null}
      {successMsg ? (
        <Alert tone="success" title="Success">
          {successMsg}
        </Alert>
      ) : null}

      {/* Profile Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-surface border border-line bg-panel p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-line bg-well flex items-center justify-center font-bold text-xl text-fg-subtle">
            {profile.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                alt={profile.fullName || profile.username}
                className="h-full w-full object-cover"
              />
            ) : (
              (profile.fullName || profile.username).charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-fg">
              {profile.fullName || profile.username}
            </h2>
            <p className="text-sm text-fg-muted font-mono">@{profile.username} · {profile.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex rounded border border-line px-2 py-0.5 text-xs font-medium">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
              {profile.department ? (
                <span className="inline-flex rounded border border-line px-2 py-0.5 text-xs text-fg-muted">
                  {profile.department}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isSelf && !isEditing ? (
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        ) : null}
      </div>

      {/* Edit Form or Bio/Stats Card */}
      {isEditing ? (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-4 rounded-surface border border-line bg-panel p-6"
        >
          <h3 className="text-base font-medium text-fg">Edit Profile Information</h3>

          <div>
            <label className="block text-xs uppercase-label mb-1">Avatar Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="text-xs text-fg-muted"
            />
          </div>

          <div>
            <label className="block text-xs uppercase-label mb-1">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs uppercase-label mb-1">Phone Number</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setFullName(profile.fullName);
                setPhone(profile.phone);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-surface border border-line bg-panel p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase-label">Contact Details</h3>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-fg-muted">
                Phone: <span className="text-fg font-medium">{profile.phone || '—'}</span>
              </p>
              <p className="text-sm text-fg-muted">
                Email: <span className="text-fg font-medium">{profile.email}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Role & Permissions Card (Available for every user on /profile) */}
      <div className="rounded-surface border border-line bg-panel p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <h3 className="text-base font-medium text-fg">Role & Permissions</h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Assigned system access tier and granted capability keys.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted">Current Role:</span>
            <span className="inline-flex rounded border border-line px-2.5 py-1 text-xs font-semibold bg-well text-fg">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          </div>
        </div>

        {profile.permissions && profile.permissions.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-fg-muted">
              Holds <span className="font-medium text-fg">{profile.permissions.length}</span> active capability permissions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {profile.permissions.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2 text-xs"
                >
                  <code className="font-mono text-[11px] rounded bg-well px-1.5 py-0.5 text-fg font-medium">
                    {perm}
                  </code>
                  <span className="text-fg-muted truncate" title={PERMISSION_LABELS[perm] ?? perm}>
                    {PERMISSION_LABELS[perm] ?? perm}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-fg-muted">No explicit permissions granted.</p>
        )}
      </div>

      {/* Security & Password Section (Available to user on their own profile) */}
      {isSelf ? (
        <div className="rounded-surface border border-line bg-panel p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-fg">Password & Security</h3>
              <p className="text-xs text-fg-muted mt-0.5">
                Manage your account credentials and password.
              </p>
            </div>
            {!isChangingPassword ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsChangingPassword(true);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
              >
                Change Password
              </Button>
            ) : null}
          </div>

          {passwordSuccess ? (
            <Alert tone="success" title="Success">
              {passwordSuccess}
            </Alert>
          ) : null}

          {passwordError ? (
            <Alert tone="error" title="Error">
              {passwordError}
            </Alert>
          ) : null}

          {isChangingPassword ? (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4 pt-2 border-t border-line">
              <Field
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
                <Field
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={passwordSaving}>
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
