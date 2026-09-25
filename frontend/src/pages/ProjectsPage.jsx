// Home page: every project in the org as a card with its progress.
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
        subtitle="Everything your organization is working on"
        action={allowed('project:write') && <Button onClick={() => setCreating(true)}>New project</Button>}
      />

      <Loading data={data} error={error}>
        {({ projects }) =>
          projects.length === 0 ? (
            <EmptyState title="No projects yet">Create one to start a board.</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
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

function ProjectCard({ project }) {
  const { TODO, IN_PROGRESS, DONE } = project.taskCounts;
  const total = TODO + IN_PROGRESS + DONE;
  const percentDone = total === 0 ? 0 : Math.round((DONE / total) * 100);

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
        <span className="mb-3 w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          {project.team.name}
        </span>
        <h2 className="font-semibold">{project.name}</h2>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-zinc-500">{project.description || 'No description'}</p>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
            <span>{total} tasks</span>
            <span>{percentDone}% done</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percentDone}%` }} />
          </div>
        </div>
      </Card>
    </Link>
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
        <p className="text-sm text-zinc-600">Every project belongs to a team. Ask an admin to create a team first.</p>
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
