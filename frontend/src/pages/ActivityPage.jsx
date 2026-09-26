// The org's audit log as a readable feed.
import { useApi } from '../hooks/useApi.js';
import { STATUS_LABELS } from '../utils/board.js';
import { Card, EmptyState, Loading, PageHeader, timeAgo } from '../components/ui.jsx';

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
      <PageHeader title="Activity" subtitle="The latest 50 changes in your organization, newest first." />
      <Loading data={data} error={error}>
        {({ activities }) =>
          activities.length === 0 ? (
            <EmptyState title="Nothing has happened yet" />
          ) : (
            <Card className="max-w-4xl">
              <ol className="divide-y divide-line">
                {activities.map((activity) => (
                  <li key={activity.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-4 px-5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <time
                      dateTime={activity.createdAt}
                      title={new Date(activity.createdAt).toLocaleString()}
                      className="text-sm text-ink-soft tabular-nums"
                    >
                      {timeAgo(activity.createdAt)}
                    </time>
                    <p>
                      <span className="font-medium">{activity.actor.name}</span>{' '}
                      <span className="text-ink-soft">{describe(activity)}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          )
        }
      </Loading>
    </>
  );
}
