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
  Avatar, Button, EmptyState, ErrorMessage, Field, Input, Loading, Modal, PriorityTab, Select, Textarea,
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
        <Link to="/" className="font-medium text-floor underline underline-offset-4 hover:text-floor-dark">Back to projects</Link>
      </EmptyState>
    );
  }

  return (
    <Loading data={project.data} error={project.error}>
      {({ project: p }) => (
        <>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link to="/" className="text-sm text-ink-soft hover:text-ink">← All projects</Link>
              <h1 className="mt-2 font-condensed text-[40px] leading-none font-semibold tracking-tight">{p.name}</h1>
              <p className="mt-2 text-ink-soft">
                <span className="font-medium text-ink">{p.team.name} team</span>
              </p>
              {p.description && <p className="mt-1 max-w-prose text-ink-soft">{p.description}</p>}
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
                <div className="grid gap-5 md:grid-cols-3">
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

// One column of the board, drawn as a slot in a card rack (the faint lines are the slots).
function Column({ column, tasks, canEdit, onOpenTask, onAddTask }) {
  return (
    <section aria-label={column.label} className="flex flex-col rounded bg-rack-deep p-3">
      <div className="mb-3 flex items-baseline justify-between border-b-2 border-ink px-1 pb-1.5">
        <h2 className="font-condensed text-[22px] font-semibold">{column.label}</h2>
        <span className="font-condensed text-[28px] leading-none font-medium text-ink-soft">{tasks.length}</span>
      </div>

      <Droppable droppableId={column.status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-28 flex-1 space-y-2.5 rounded-sm bg-[repeating-linear-gradient(to_bottom,transparent_0_31px,rgb(31_42_46/0.07)_31px_32px)] p-0.5 transition-colors ${
              snapshot.isDraggingOver ? 'bg-stock/50' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                {(provided, snapshot) => (
                  <TaskCard
                    task={task}
                    provided={provided}
                    isDragging={snapshot.isDragging}
                    onOpen={() => onOpenTask(task)}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {onAddTask && <AddTaskForm onAdd={onAddTask} />}
    </section>
  );
}

// A task drawn as a T-card: coloured priority tab on top, title below.
// Only the card being dragged gets a shadow — it's the one thing lifted off the rack.
function TaskCard({ task, provided, isDragging, onOpen }) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onOpen}
      className={`cursor-pointer overflow-hidden rounded-[3px] border bg-stock transition-colors ${
        isDragging ? 'rotate-[1.5deg] border-ink shadow-[0_12px_24px_rgb(31_42_46/0.28)]' : 'border-line hover:border-ink'
      }`}
    >
      <PriorityTab priority={task.priority} />
      <div className="px-3 pt-2 pb-2.5">
        <p className="font-condensed text-[17px] leading-snug font-semibold">{task.title}</p>
        {(task.description || task.assignee) && (
          <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            {task.description && <span>Has notes</span>}
            <span className="flex-1" />
            {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
          </div>
        )}
      </div>
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
        aria-label="Add a task"
        className="w-full rounded-[3px] border border-dashed border-ink-soft/50 bg-transparent px-3 py-2 outline-none transition-colors placeholder:text-ink-soft hover:border-ink hover:bg-stock/60 focus:border-floor focus:border-solid focus:bg-stock"
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
            <span className="text-sm text-ink-soft">Viewers can't edit tasks.</span>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
            {canEdit && <Button type="submit">Save changes</Button>}
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
            <Button type="submit">Save changes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
