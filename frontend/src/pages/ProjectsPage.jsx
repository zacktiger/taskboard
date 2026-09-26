// Home page: every project in the org as one row of a list, with its progress by column.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Button, Card, EmptyState, ErrorMessage, Field, Input, Loading, Modal, PageHeader, Select, Spinner, Textarea,
} from '../components/ui.jsx';

export default function ProjectsPage() {
  const { allowed } = useAuth();
  const { data, error, reload } = useApi('/projects');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every project in your organization. Open one to see its board."
        action={allowed('project:write') && <Button onClick={() => setCreating(true)}>New project</Button>}
      />

      <Loading data={data} error={error}>
        {({ projects }) =>
          projects.length === 0 ? (
            <EmptyState title="No projects yet">Create one to start a board.</EmptyState>
          ) : (
            <Card>
              <ul className="divide-y divide-line">
                {projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </ul>
            </Card>
          )
        }
      </Loading>

      {creating && (
        <NewProjectModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </>
  );
}

// Progress is split into the board's three columns, so you can see where the work sits,
// not just how much is done. Shades of ink only: colour is reserved for priority.
const SEGMENTS = [
  { status: 'DONE', label: 'done', swatch: 'bg-ink' },
  { status: 'IN_PROGRESS', label: 'in progress', swatch: 'bg-ink-soft/60' },
  { status: 'TODO', label: 'to do', swatch: 'bg-line' },
];

function ProjectRow({ project }) {
  const counts = project.taskCounts;
  const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;

  return (
    <li>
      <Link
        to={`/projects/${project.id}`}
        className="grid gap-x-6 gap-y-3 px-5 py-4 transition-colors hover:bg-rack/60 md:grid-cols-[minmax(0,1fr)_9rem_17rem] md:items-center"
      >
        <div className="min-w-0">
          <h2 className="font-condensed text-xl font-semibold">{project.name}</h2>
          <p className="truncate text-ink-soft">{project.description || 'No description'}</p>
        </div>

        <p className="text-ink-soft">
          <span className="font-medium text-ink">{project.team.name}</span> team
        </p>

        <div>
          <div className="flex h-2.5 overflow-hidden rounded-sm bg-line" aria-hidden="true">
            {total > 0 &&
              SEGMENTS.map((s) => (
                <div key={s.status} className={s.swatch} style={{ width: `${(counts[s.status] / total) * 100}%` }} />
              ))}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
            {total === 0
              ? 'No tasks yet'
              : SEGMENTS.map((s) => (
                  <span key={s.status} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-sm ${s.swatch}`} />
                    {counts[s.status]} {s.label}
                  </span>
                ))}
          </p>
        </div>
      </Link>
    </li>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  const { data } = useApi('/teams');
  const [form, setForm] = useState({ name: '', description: '', teamId: '' });
  const [error, setError] = useState('');
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await api('/projects', { method: 'POST', body: form });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  const teams = data?.teams ?? [];

  return (
    <Modal title="New project" onClose={onClose}>
      {!data ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : teams.length === 0 ? (
        <p className="text-ink-soft">Every project belongs to a team. Ask an admin to create a team first.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input name="name" value={form.name} onChange={update} required autoFocus />
          </Field>
          <Field label="Team">
            <Select name="teamId" value={form.teamId} onChange={update} required>
              <option value="">Choose a team…</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <Textarea name="description" value={form.description} onChange={update} />
          </Field>
          <ErrorMessage message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create project</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
