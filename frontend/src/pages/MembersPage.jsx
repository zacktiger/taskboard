// Admin-only: the member lifecycle — invite people, change roles, remove members.
// App.jsx guards this route with <RequirePermission action="member:manage">.
import { useState } from 'react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Button, Card, ErrorMessage, Input, Loading, PageHeader, RoleBadge, Select, timeAgo } from '../components/ui.jsx';

const ROLES = ['ADMIN', 'MEMBER', 'VIEWER'];
const ROLE_LABELS = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export default function MembersPage() {
  const { user } = useAuth();
  const members = useApi('/members');
  const invitations = useApi('/invitations');
  const [error, setError] = useState('');

  // Runs an API call, then reloads both lists (or shows the error).
  async function run(request) {
    try {
      await request();
      setError('');
    } catch (err) {
      setError(err.message);
    }
    members.reload();
    invitations.reload();
  }

  function removeMember(member) {
    if (window.confirm(`Remove ${member.name} from the organization?`)) {
      run(() => api(`/members/${member.id}`, { method: 'DELETE' }));
    }
  }

  return (
    <>
      <PageHeader title="Members" subtitle="Who is in your organization and what each person can do." />
      <div className="mb-4">
        <ErrorMessage message={error} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <Loading data={members.data} error={members.error}>
            {({ members: list }) => (
              <ul className="divide-y divide-line">
                {list.map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <Avatar name={member.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {member.name} {member.id === user.id && <span className="font-normal text-ink-soft">(you)</span>}
                      </p>
                      <p className="truncate text-sm text-ink-soft">{member.email}</p>
                    </div>
                    {/* You can't change your own role or remove yourself from here. */}
                    {member.id === user.id ? (
                      <RoleBadge role={member.role} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-32">
                          <Select
                            value={member.role}
                            onChange={(e) =>
                              run(() => api(`/members/${member.id}`, { method: 'PATCH', body: { role: e.target.value } }))
                            }
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                            ))}
                          </Select>
                        </div>
                        <Button variant="ghost" onClick={() => removeMember(member)}>
                          Remove
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Loading>
        </Card>

        <div className="space-y-6">
          <InviteForm onInvited={() => invitations.reload()} />

          <Card className="p-5">
            <h2 className="mb-3 font-condensed text-xl font-semibold">Pending invites</h2>
            <Loading data={invitations.data} error={invitations.error}>
              {({ invitations: list }) =>
                list.length === 0 ? (
                  <p className="text-ink-soft">No pending invites.</p>
                ) : (
                  <ul className="space-y-3">
                    {list.map((invite) => (
                      <li key={invite.id} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{invite.email}</p>
                          <p className="text-sm text-ink-soft">
                            Invited as {ROLE_LABELS[invite.role].toLowerCase()}, {timeAgo(invite.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => run(() => api(`/invitations/${invite.id}`, { method: 'DELETE' }))}
                          className="rounded px-1.5 py-0.5 text-sm text-ink-soft hover:text-tab-high"
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              }
            </Loading>
          </Card>
        </div>
      </div>
    </>
  );
}

// Creates an invite and shows the link to share (there's no email sending).
function InviteForm({ onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const { inviteLink } = await api('/invitations', { method: 'POST', body: { email, role } });
      setLink(inviteLink);
      setCopied(false);
      setEmail('');
      setError('');
      onInvited();
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-condensed text-xl font-semibold">Invite someone</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required />
        <div className="flex gap-2">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
          <Button type="submit" className="shrink-0">Invite</Button>
        </div>
        <ErrorMessage message={error} />
      </form>

      {link && (
        <div className="mt-4 rounded border border-floor bg-rack p-3">
          <p className="mb-1 font-medium">Send this link to them. It's shown only once.</p>
          <p className="mb-3 text-sm break-all text-ink-soft">{link}</p>
          <Button variant="secondary" className="w-full" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      )}
    </Card>
  );
}
