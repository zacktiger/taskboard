// A project's Kanban board.
// Dragging a card updates the screen immediately (optimistic UI), then tells the server.
// If the server says no, we put the cards back where they were.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COLUMNS, PRIORITIES, moveTask, tasksInColumn } from '../utils/board.js';
import {
  Avatar, Button, EmptyState, ErrorMessage, Field, Input, Loading, Modal, PriorityBadge, Select, Textarea,
} from '../components/ui.jsx';

export default function BoardPage() {
  const { projectId } = useParams();
  const { allowed } = useAuth();
  const canEditTasks = allowed('task:write');

  const project = useApi(`/projects/${projectId}`);
  const tasks = useApi(`/projects/${projectId}/tasks`);
  const members = useApi('/members');

  const [openTask, setOpenTask] = useState(null);
  const [editingProject, setEditingProject] = useState(false);
  const [error, setError] = useState('');

  async function handleDragEnd({ source, destination, draggableId }) {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const before = tasks.data.tasks;
    tasks.setData({ tasks: moveTask(before, draggableId, destination.droppableId, destination.index) });
    setError('');

    try {
      await api(`/tasks/${draggableId}/move`, {
        method: 'PATCH',
        body: { status: destination.droppableId, position: destination.index },
      });
    } catch (err) {
      tasks.setData({ tasks: before }); // roll back
      setError(`Couldn't move the task: ${err.message}`);
    }
  }

  async function addTask(title) {
    const { task } = await api(`/projects/${projectId}/tasks`, { method: 'POST', body: { title } });
    tasks.setData((current) => ({ tasks: [...current.tasks, task] }));
  }

  // Swap one task in the list for its updated version from the server.
  function replaceTask(updated) {
    tasks.setData((current) => ({ tasks: current.tasks.map((t) => (t.id === updated.id ? updated : t)) }));
  }

  // Unknown id, deleted project, or another org's project: the API says 404 for all of them.
  if (project.error) {
    return (
      <EmptyState title={project.error}>
        <Link to="/" className="font-medium text-indigo-600 hover:text-indigo-500">← Back to projects</Link>
      </EmptyState>
    );
  }

  return (
    <Loading data={project.data} error={project.error}>
      {({ project: p }) => (
        <>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Projects</Link>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{p.name}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                <span className="font-medium text-zinc-700">{p.team.name}</span>
                {p.description && ` · ${p.description}`}
              </p>
            </div>
            {allowed('project:write') && (
              <Button variant="secondary" onClick={() => setEditingProject(true)}>Edit project</Button>
            )}
          </div>

          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>

          <Loading data={tasks.data} error={tasks.error}>
            {({ tasks: allTasks }) => (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid gap-4 md:grid-cols-3">
                  {COLUMNS.map((column) => (
                    <Column
                      key={column.status}
                      column={column}
                      tasks={tasksInColumn(allTasks, column.status)}
                      canEdit={canEditTasks}
                      onOpenTask={setOpenTask}
                      onAddTask={column.status === 'TODO' && canEditTasks ? addTask : null}
                    />
                  ))}
                </div>
              </DragDropContext>
            )}
          </Loading>

          {openTask && (
            <TaskModal
              task={openTask}
              members={members.data?.members ?? []}
              canEdit={canEditTasks}
              onClose={() => setOpenTask(null)}
              onSaved={(updated) => {
                replaceTask(updated);
                setOpenTask(null);
              }}
              onDeleted={() => {
                setOpenTask(null);
                tasks.reload(); // positions below the deleted card shifted up
              }}
            />
          )}

          {editingProject && (
            <ProjectModal
              project={p}
              onClose={() => setEditingProject(false)}
              onSaved={() => {
                setEditingProject(false);
                project.reload();
              }}
            />
          )}
        </>
      )}
    </Loading>
  );
}

function Column({ column, tasks, canEdit, onOpenTask, onAddTask }) {
  return (
    <div className="flex flex-col rounded-2xl bg-zinc-100/80 p-3">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${column.dot}`} />
        <h2 className="text-sm font-semibold text-zinc-700">{column.label}</h2>
        <span className="text-xs text-zinc-400">{tasks.length}</span>
      </div>

      <Droppable droppableId={column.status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-24 flex-1 space-y-2 rounded-xl transition ${snapshot.isDraggingOver ? 'bg-indigo-50' : ''}`}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onOpenTask(task)}
                    className={`cursor-pointer rounded-xl border bg-white p-3 text-sm shadow-sm transition hover:border-indigo-200 ${
                      snapshot.isDragging ? 'rotate-1 border-indigo-300 shadow-lg' : 'border-zinc-200'
                    }`}
                  >
                    <p className="font-medium text-zinc-800">{task.title}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      {task.description && <span className="text-xs text-zinc-400">≡ Notes</span>}
                      <span className="flex-1" />
                      {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {onAddTask && <AddTaskForm onAdd={onAddTask} />}
    </div>
  );
}

function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      await onAdd(title);
      setTitle('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="+ Add a task"
        className="w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm outline-none transition placeholder:text-zinc-500 hover:bg-white focus:border-zinc-200 focus:bg-white"
      />
      <ErrorMessage message={error} />
    </form>
  );
}

// View a task; members and admins can also edit or delete it.
function TaskModal({ task, members, canEdit, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    assigneeId: task.assignee?.id ?? '',
  });
  const [error, setError] = useState('');
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSave(event) {
    event.preventDefault();
    try {
      const { task: updated } = await api(`/tasks/${task.id}`, { method: 'PATCH', body: form });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title={canEdit ? 'Edit task' : 'Task'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <fieldset disabled={!canEdit} className="space-y-4">
          <Field label="Title">
            <Input name="title" value={form.title} onChange={update} required />
          </Field>
          <Field label="Description">
            <Textarea name="description" value={form.description} onChange={update} placeholder="Add more detail…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Select name="priority" value={form.priority} onChange={update}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Assignee">
              <Select name="assigneeId" value={form.assigneeId} onChange={update}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </fieldset>
        <ErrorMessage message={error} />
        <div className="flex items-center justify-between">
          {canEdit ? (
            <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>
          ) : (
            <span className="text-xs text-zinc-500">Viewers can't edit tasks.</span>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
            {canEdit && <Button type="submit">Save</Button>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

// Rename or delete the project.
function ProjectModal({ project, onClose, onSaved }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: project.name, description: project.description });
  const [error, setError] = useState('');
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSave(event) {
    event.preventDefault();
    try {
      await api(`/projects/${project.id}`, { method: 'PATCH', body: form });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.name}" and all its tasks?`)) return;
    try {
      await api(`/projects/${project.id}`, { method: 'DELETE' });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Edit project" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Name">
          <Input name="name" value={form.name} onChange={update} required />
        </Field>
        <Field label="Description">
          <Textarea name="description" value={form.description} onChange={update} />
        </Field>
        <ErrorMessage message={error} />
        <div className="flex items-center justify-between">
          <Button type="button" variant="danger" onClick={handleDelete}>Delete project</Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
