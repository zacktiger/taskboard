// Teams in the org. Everyone can see them; only admins can create, delete or change members.
import { useState } from 'react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Button, Card, EmptyState, ErrorMessage, Input, Loading, PageHeader, Select } from '../components/ui.jsx';

export default function TeamsPage() {
  const { allowed } = useAuth();
  const canManage = allowed('team:manage');
  const teams = useApi('/teams');
  const members = useApi('/members');
  const [error, setError] = useState('');

  // Runs an API call, then reloads the teams (or shows the error).
  async function run(request) {
    try {
      await request();
      setError('');
      teams.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Teams" subtitle="Groups of people who work on projects together." />
      {canManage && <NewTeamForm onCreate={(name) => run(() => api('/teams', { method: 'POST', body: { name } }))} />}
      <div className="mb-4">
        <ErrorMessage message={error} />
      </div>

      <Loading data={teams.data} error={teams.error}>
        {({ teams: list }) =>
          list.length === 0 ? (
            <EmptyState title="No teams yet">{canManage ? 'Create one above.' : 'An admin can create one.'}</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  orgMembers={members.data?.members ?? []}
                  canManage={canManage}
                  run={run}
                />
              ))}
            </div>
          )
        }
      </Loading>
    </>
  );
}

function NewTeamForm({ onCreate }) {
  const [name, setName] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onCreate(name);
    setName('');
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex max-w-md gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" required />
      <Button type="submit" className="shrink-0">Create team</Button>
    </form>
  );
}

function TeamCard({ team, orgMembers, canManage, run }) {
  const [userToAdd, setUserToAdd] = useState('');
  const memberIds = new Set(team.members.map((m) => m.id));
  const addable = orgMembers.filter((m) => !memberIds.has(m.id));

  function addMember(event) {
    event.preventDefault();
    run(() => api(`/teams/${team.id}/members`, { method: 'POST', body: { userId: userToAdd } }));
    setUserToAdd('');
  }

  function deleteTeam() {
    if (window.confirm(`Delete team "${team.name}"?`)) run(() => api(`/teams/${team.id}`, { method: 'DELETE' }));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-condensed text-xl font-semibold">{team.name}</h2>
          <p className="text-sm text-ink-soft">
            {plural(team.members.length, 'member')}, {plural(team.projectCount, 'project')}
          </p>
        </div>
        {canManage && (
          <Button variant="ghost" onClick={deleteTeam}>Delete team</Button>
        )}
      </div>

      <ul className="space-y-2">
        {team.members.map((member) => (
          <li key={member.id} className="flex items-center gap-3">
            <Avatar name={member.name} size="sm" />
            <span className="flex-1">{member.name}</span>
            {canManage && (
              <button
                onClick={() => run(() => api(`/teams/${team.id}/members/${member.id}`, { method: 'DELETE' }))}
                className="rounded px-1.5 py-0.5 text-sm text-ink-soft hover:text-tab-high"
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {team.members.length === 0 && <li className="text-ink-soft">No one on this team yet.</li>}
      </ul>

      {canManage && addable.length > 0 && (
        <form onSubmit={addMember} className="mt-4 flex gap-2 border-t border-line pt-4">
          <Select value={userToAdd} onChange={(e) => setUserToAdd(e.target.value)} required>
            <option value="">Add a member…</option>
            {addable.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" className="shrink-0">Add to team</Button>
        </form>
      )}
    </Card>
  );
}

// "1 member", "3 members"
function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
