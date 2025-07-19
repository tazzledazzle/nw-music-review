/**
 * User profile page
 */

import UserProfile from '../../components/auth/UserProfile';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <UserProfile />
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Your Profile',
  description: 'Manage your account and preferences',
};
