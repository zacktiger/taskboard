// The org's audit log as a readable feed.
import { useApi } from '../hooks/useApi.js';
import { STATUS_LABELS } from '../utils/board.js';
import { Avatar, Card, EmptyState, Loading, PageHeader, timeAgo } from '../components/ui.jsx';

// Turns each logged action into a sentence. `m` is the activity's `meta` object.
const DESCRIBE = {
  'org.created': (m) => `created the organization ${m.name}`,
  'member.joined': (m) => `joined as ${m.role.toLowerCase()}`,
  'member.role_changed': (m) => `changed ${m.name}'s role from ${m.from.toLowerCase()} to ${m.to.toLowerCase()}`,
  'member.removed': (m) => `removed ${m.name} from the organization`,
  'invitation.created': (m) => `invited ${m.email} as ${m.role.toLowerCase()}`,
  'invitation.revoked': (m) => `revoked the invite for ${m.email}`,
  'team.created': (m) => `created the team ${m.name}`,
  'team.deleted': (m) => `deleted the team ${m.name}`,
  'team.member_added': (m) => `added ${m.name} to ${m.team}`,
  'team.member_removed': (m) => `removed ${m.name} from ${m.team}`,
  'project.created': (m) => `created the project ${m.name}`,
  'project.updated': (m) => `updated the project ${m.name}`,
  'project.deleted': (m) => `deleted the project ${m.name}`,
  'task.created': (m) => `created “${m.title}”`,
  'task.updated': (m) => `updated “${m.title}”`,
  'task.deleted': (m) => `deleted “${m.title}”`,
  'task.moved': (m) => `moved “${m.title}” from ${STATUS_LABELS[m.from]} to ${STATUS_LABELS[m.to]}`,
};

function describe(activity) {
  return DESCRIBE[activity.action]?.(activity.meta ?? {}) ?? activity.action;
}

export default function ActivityPage() {
  const { data, error } = useApi('/activity');

  return (
    <>
      <PageHeader title="Activity" subtitle="The latest 50 changes across your organization" />
      <Loading data={data} error={error}>
        {({ activities }) =>
          activities.length === 0 ? (
            <EmptyState title="Nothing has happened yet" />
          ) : (
            <Card>
              <ul className="divide-y divide-zinc-100">
                {activities.map((activity) => (
                  <li key={activity.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                    <Avatar name={activity.actor.name} size="sm" />
                    <p className="flex-1">
                      <span className="font-medium">{activity.actor.name}</span>{' '}
                      <span className="text-zinc-600">{describe(activity)}</span>
                    </p>
                    <time className="shrink-0 text-xs text-zinc-400">{timeAgo(activity.createdAt)}</time>
                  </li>
                ))}
              </ul>
            </Card>
          )
        }
      </Loading>
    </>
  );
}
