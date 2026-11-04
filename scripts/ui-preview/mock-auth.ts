// Loopback-only fixture. No connection to Supabase or real credential.
const params = new URLSearchParams(location.search);
const role = params.has('associate') ? 'associate' : params.has('reviewer') ? 'reviewer' : 'admin';
const user = { id: 'local-ui-fixture', email: 'contoh@example.test', app_metadata: { role }, user_metadata: { full_name: 'Admin Contoh' } };
export const useAuth = () => ({ user, loading: false, accessToken: 'synthetic-not-a-credential', signOut() {} });
