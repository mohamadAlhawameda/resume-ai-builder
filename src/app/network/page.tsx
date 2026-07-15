'use client';

// Networking — the recruiter-contact CRM: manually-saved contacts with an
// activity log, follow-up reminders, and a company watchlist. Every contact
// field is user-entered; the app never looks up or guesses contact details.

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  Bell,
  BellPlus,
  Eye,
  Building2,
  Linkedin,
  Link2,
  Mail,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  MessagesSquare,
  Send,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Tabs, { TabPanel } from '@/components/ui/Tabs';
import Sheet from '@/components/ui/Sheet';
import Table, { type Column } from '@/components/ui/Table';
import CompanyIntelligencePanel from '@/components/CompanyIntelligence';
import { api, apiErrorMessage } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { useLocale } from '@/i18n/LocaleProvider';
import type { Contact, ContactActivityType, Reminder, ReminderType, WatchlistItem } from '@/lib/types';

type Tab = 'contacts' | 'reminders' | 'watchlist';

const EMPTY_FORM = {
  name: '',
  role: '',
  company: '',
  email: '',
  linkedinUrl: '',
  careerPageUrl: '',
  notes: '',
};

const MESSAGE_TOOLS: { tool: string; labelKey: string }[] = [
  { tool: 'connection-request', labelKey: 'network.msgConnection' },
  { tool: 'recruiter-message', labelKey: 'network.msgIntro' },
  { tool: 'referral-request', labelKey: 'network.msgReferral' },
  { tool: 'follow-up-email', labelKey: 'network.msgFollowUp' },
  { tool: 'thank-you-email', labelKey: 'network.msgThankYou' },
];

const ACTIVITY_TYPES: ContactActivityType[] = [
  'connection-request-sent',
  'message-sent',
  'call',
  'meeting',
  'reply-received',
  'other',
];

const REMINDER_TYPES: ReminderType[] = ['follow-up', 'interview', 'networking', 'other'];

function NetworkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, formatDate } = useLocale();

  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'contacts');
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // Contact create/edit sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Contact detail sheet
  const [detail, setDetail] = useState<Contact | null>(null);
  const [activityType, setActivityType] = useState<ContactActivityType>('message-sent');
  const [activityNote, setActivityNote] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Reminder sheet
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({ title: '', type: 'follow-up' as ReminderType, dueDate: '', relatedContactId: '' });
  const [savingReminder, setSavingReminder] = useState(false);

  // Watchlist
  const [watchInput, setWatchInput] = useState('');
  const [addingWatch, setAddingWatch] = useState(false);
  const [intelCompany, setIntelCompany] = useState<string | null>(null);

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      api<Contact[]>('/contacts'),
      api<Reminder[]>('/reminders'),
      api<WatchlistItem[]>('/companies/watchlist'),
    ]);
    if (results[0].status === 'fulfilled') setContacts(results[0].value);
    if (results[1].status === 'fulfilled') setReminders(results[1].value);
    if (results[2].status === 'fulfilled') setWatchlist(results[2].value);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) toast.error(apiErrorMessage(failed.reason, t('network.loadError')));
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login?redirect=/network');
      return;
    }
    load();
  }, [router, load]);

  // ---- Contacts ----

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setForm({
      name: contact.name,
      role: contact.role,
      company: contact.company,
      email: contact.email,
      linkedinUrl: contact.linkedinUrl,
      careerPageUrl: contact.careerPageUrl,
      notes: contact.notes,
    });
    setDetail(null);
    setSheetOpen(true);
  };

  const saveContact = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await api<Contact>(`/contacts/${editing._id}`, { method: 'PATCH', body: form });
        setContacts((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        toast.success(t('network.contactUpdated'));
      } else {
        const created = await api<Contact>('/contacts', { method: 'POST', body: form });
        setContacts((prev) => [created, ...prev]);
        toast.success(t('network.contactAdded'));
      }
      setSheetOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (contact: Contact) => {
    if (!window.confirm(t('network.confirmDeleteContact', { name: contact.name }))) return;
    try {
      await api(`/contacts/${contact._id}`, { method: 'DELETE' });
      setContacts((prev) => prev.filter((c) => c._id !== contact._id));
      setDetail(null);
      toast.success(t('network.contactDeleted'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const logActivity = async () => {
    if (!detail) return;
    setLoggingActivity(true);
    try {
      const updated = await api<Contact>(`/contacts/${detail._id}/activity`, {
        method: 'POST',
        body: { type: activityType, note: activityNote },
      });
      setContacts((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setDetail(updated);
      setActivityNote('');
      toast.success(t('network.activityLogged'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoggingActivity(false);
    }
  };

  // Message generation reuses the AI Tools page (same sessionStorage handoff
  // the jobs page already uses) so all generators share one polished UI.
  const generateMessage = (contact: Contact, tool: string) => {
    sessionStorage.setItem(
      'tools:jobContext',
      JSON.stringify({ company: contact.company, recipientName: contact.name })
    );
    router.push(`/tools?tool=${tool}`);
  };

  // ---- Reminders ----

  const saveReminder = async () => {
    if (!reminderForm.title.trim() || !reminderForm.dueDate) return;
    setSavingReminder(true);
    try {
      const created = await api<Reminder>('/reminders', {
        method: 'POST',
        body: {
          title: reminderForm.title,
          type: reminderForm.type,
          dueDate: new Date(reminderForm.dueDate).toISOString(),
          relatedContactId: reminderForm.relatedContactId || null,
        },
      });
      setReminders((prev) => [...prev, created].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)));
      setReminderSheetOpen(false);
      setReminderForm({ title: '', type: 'follow-up', dueDate: '', relatedContactId: '' });
      toast.success(t('network.reminderAdded'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingReminder(false);
    }
  };

  const setReminderStatus = async (reminder: Reminder, status: 'done' | 'dismissed') => {
    try {
      await api(`/reminders/${reminder._id}`, { method: 'PATCH', body: { status } });
      setReminders((prev) => prev.map((r) => (r._id === reminder._id ? { ...r, status } : r)));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  // ---- Watchlist ----

  const addWatch = async () => {
    const name = watchInput.trim();
    if (!name) return;
    setAddingWatch(true);
    try {
      const item = await api<WatchlistItem>('/companies/watchlist', { method: 'POST', body: { companyName: name } });
      setWatchlist((prev) => (prev.some((w) => w._id === item._id) ? prev : [item, ...prev]));
      setWatchInput('');
      toast.success(t('network.watched', { company: name }));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setAddingWatch(false);
    }
  };

  const removeWatch = async (item: WatchlistItem) => {
    try {
      await api(`/companies/watchlist/${item._id}`, { method: 'DELETE' });
      setWatchlist((prev) => prev.filter((w) => w._id !== item._id));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  // ---- Derived ----

  const pendingReminders = useMemo(() => reminders.filter((r) => r.status === 'pending'), [reminders]);
  const now = Date.now();

  const contactColumns: Column<Contact>[] = [
    {
      key: 'name',
      header: t('network.colName'),
      hideLabelOnCard: true,
      render: (c) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{c.name}</p>
          {c.role && <p className="text-xs text-muted-foreground truncate">{c.role}</p>}
        </div>
      ),
    },
    {
      key: 'company',
      header: t('network.colCompany'),
      render: (c) => (c.company ? <span className="text-foreground">{c.company}</span> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'status',
      header: t('network.colStatus'),
      render: (c) =>
        c.contacted ? (
          <Badge tone="green">{t('network.contacted')}</Badge>
        ) : (
          <Badge tone="slate">{t('network.notContacted')}</Badge>
        ),
    },
    {
      key: 'lastContact',
      header: t('network.colLastContact'),
      render: (c) =>
        c.lastContactDate ? (
          <span className="text-muted-foreground text-sm">{formatDate(c.lastContactDate)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <Skeleton className="h-10 w-80 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('network.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('network.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<BellPlus className="w-4 h-4" />} onClick={() => setReminderSheetOpen(true)}>
            {t('network.addReminder')}
          </Button>
          <Button icon={<UserPlus className="w-4 h-4" />} onClick={openCreate}>
            {t('network.addContact')}
          </Button>
        </div>
      </div>

      {/* Privacy note — sets expectations honestly */}
      <p className="text-xs text-muted-foreground mb-6 max-w-2xl">{t('network.privacyNote')}</p>

      <Tabs
        ariaLabel={t('network.title')}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        className="mb-6"
        items={[
          { value: 'contacts', label: t('network.tabContacts'), icon: Users, badge: contacts.length > 0 ? <Badge tone="slate">{contacts.length}</Badge> : undefined },
          { value: 'reminders', label: t('network.tabReminders'), icon: Bell, badge: pendingReminders.length > 0 ? <Badge tone="blue">{pendingReminders.length}</Badge> : undefined },
          { value: 'watchlist', label: t('network.tabWatchlist'), icon: Eye, badge: watchlist.length > 0 ? <Badge tone="slate">{watchlist.length}</Badge> : undefined },
        ]}
      />

      {/* ---------------- Contacts ---------------- */}
      <TabPanel value="contacts" activeValue={tab}>
        <Table
          columns={contactColumns}
          rows={contacts}
          rowKey={(c) => c._id}
          onRowClick={(c) => setDetail(c)}
          caption={t('network.tabContacts')}
          emptyState={
            <Card>
              <EmptyState
                icon={<Users className="w-6 h-6" />}
                title={t('network.noContactsTitle')}
                description={t('network.noContactsDescription')}
                action={<Button icon={<UserPlus className="w-4 h-4" />} onClick={openCreate}>{t('network.addContact')}</Button>}
              />
            </Card>
          }
        />
      </TabPanel>

      {/* ---------------- Reminders ---------------- */}
      <TabPanel value="reminders" activeValue={tab}>
        {pendingReminders.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Bell className="w-6 h-6" />}
              title={t('network.noRemindersTitle')}
              description={t('network.noRemindersDescription')}
              action={<Button icon={<BellPlus className="w-4 h-4" />} onClick={() => setReminderSheetOpen(true)}>{t('network.addReminder')}</Button>}
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {pendingReminders.map((r) => {
              const overdue = +new Date(r.dueDate) <= now;
              const contact = contacts.find((c) => c._id === r.relatedContactId);
              return (
                <li key={r._id}>
                  <Card className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`network.reminderType.${r.type}`)} · {formatDate(r.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {contact && <> · {contact.name}</>}
                      </p>
                    </div>
                    {overdue && <Badge tone="red">{t('network.overdue')}</Badge>}
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => setReminderStatus(r, 'done')}>
                        {t('network.markDone')}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => setReminderStatus(r, 'dismissed')}>
                        {t('network.dismiss')}
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </TabPanel>

      {/* ---------------- Watchlist ---------------- */}
      <TabPanel value="watchlist" activeValue={tab}>
        <Card className="mb-4">
          <label htmlFor="watch-company" className="block text-sm font-medium text-foreground mb-1.5">
            {t('network.watchCompanyLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="watch-company"
              value={watchInput}
              onChange={(e) => setWatchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWatch()}
              placeholder={t('network.watchCompanyPlaceholder')}
              className="flex-1 px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button loading={addingWatch} onClick={addWatch} icon={<Eye className="w-4 h-4" />}>
              {t('network.watch')}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t('network.watchHelper')}</p>
        </Card>
        {watchlist.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Building2 className="w-6 h-6" />}
              title={t('network.noWatchlistTitle')}
              description={t('network.noWatchlistDescription')}
            />
          </Card>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {watchlist.map((w) => (
              <li key={w._id}>
                <Card className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" aria-hidden />
                  </div>
                  <p className="font-medium text-foreground flex-1 truncate">{w.companyName}</p>
                  <Button size="sm" variant="outline" onClick={() => setIntelCompany(w.companyName)}>
                    {t('network.viewIntel')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t('network.unwatch')}
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => removeWatch(w)}
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </TabPanel>

      {/* ---------------- Create/edit contact sheet ---------------- */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? t('network.editContact') : t('network.addContact')}>
        <div className="space-y-4">
          {(
            [
              { id: 'name', labelKey: 'network.fieldName', required: true, helperKey: '' },
              { id: 'role', labelKey: 'network.fieldRole', required: false, helperKey: '' },
              { id: 'company', labelKey: 'network.fieldCompany', required: false, helperKey: '' },
              { id: 'email', labelKey: 'network.fieldEmail', required: false, helperKey: 'network.fieldEmailHelper' },
              { id: 'linkedinUrl', labelKey: 'network.fieldLinkedin', required: false, helperKey: '' },
              { id: 'careerPageUrl', labelKey: 'network.fieldCareerPage', required: false, helperKey: 'network.fieldCareerPageHelper' },
            ] as const
          ).map(({ id, labelKey, required, helperKey }) => (
            <div key={id}>
              <label htmlFor={`contact-${id}`} className="block text-sm font-medium text-foreground mb-1.5">
                {t(labelKey)}
                {required && <span className="text-danger"> *</span>}
              </label>
              <input
                id={`contact-${id}`}
                value={form[id]}
                onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
                className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {helperKey && <p className="mt-1 text-xs text-muted-foreground">{t(helperKey)}</p>}
            </div>
          ))}
          <div>
            <label htmlFor="contact-notes" className="block text-sm font-medium text-foreground mb-1.5">
              {t('network.fieldNotes')}
            </label>
            <textarea
              id="contact-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} disabled={!form.name.trim()} onClick={saveContact}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* ---------------- Contact detail sheet ---------------- */}
      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name || ''}>
        {detail && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="space-y-1 text-sm">
              {detail.role && <p className="text-muted-foreground">{detail.role}{detail.company && ` · ${detail.company}`}</p>}
              {!detail.role && detail.company && <p className="text-muted-foreground">{detail.company}</p>}
              {detail.email && (
                <p className="flex items-center gap-1.5 text-foreground">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" aria-hidden /> {detail.email}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                {detail.linkedinUrl && (
                  <a href={detail.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                    <Linkedin className="w-3.5 h-3.5" aria-hidden /> LinkedIn <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                )}
                {detail.careerPageUrl && (
                  <a href={detail.careerPageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                    <Link2 className="w-3.5 h-3.5" aria-hidden /> {t('network.fieldCareerPage')} <ExternalLink className="w-3 h-3" aria-hidden />
                  </a>
                )}
              </div>
              {detail.notes && <p className="text-muted-foreground pt-1 whitespace-pre-line">{detail.notes}</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(detail)}>
                {t('network.editContact')}
              </Button>
              {detail.company && (
                <Button size="sm" variant="outline" icon={<Building2 className="w-3.5 h-3.5" />} onClick={() => { setIntelCompany(detail.company); }}>
                  {t('network.viewIntel')}
                </Button>
              )}
              <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => deleteContact(detail)}>
                {t('network.deleteContact')}
              </Button>
            </div>

            {/* Message generators */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-warning" aria-hidden /> {t('network.generateMessage')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TOOLS.map(({ tool, labelKey }) => (
                  <Button key={tool} size="sm" variant="outline" icon={<Send className="w-3.5 h-3.5" />} onClick={() => generateMessage(detail, tool)}>
                    {t(labelKey)}
                  </Button>
                ))}
              </div>
            </section>

            {/* Activity log */}
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <MessagesSquare className="w-4 h-4 text-accent" aria-hidden /> {t('network.activityLog')}
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <select
                  aria-label={t('network.activityTypeLabel')}
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as ContactActivityType)}
                  className="px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`network.activityType.${type}`)}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={t('network.activityNoteLabel')}
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  placeholder={t('network.activityNotePlaceholder')}
                  className="flex-1 px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button size="sm" loading={loggingActivity} onClick={logActivity}>
                  {t('network.logActivity')}
                </Button>
              </div>
              {detail.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('network.noActivity')}</p>
              ) : (
                <ul className="space-y-2">
                  {[...detail.activity]
                    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                    .map((a) => (
                      <li key={a._id} className="text-sm border-s-2 border-accent/40 ps-3">
                        <p className="text-foreground font-medium">{t(`network.activityType.${a.type}`)}</p>
                        {a.note && <p className="text-muted-foreground">{a.note}</p>}
                        <p className="text-xs text-muted-foreground/80">{formatDate(a.date)}</p>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Sheet>

      {/* ---------------- Add reminder sheet ---------------- */}
      <Sheet open={reminderSheetOpen} onClose={() => setReminderSheetOpen(false)} title={t('network.addReminder')}>
        <div className="space-y-4">
          <div>
            <label htmlFor="reminder-title" className="block text-sm font-medium text-foreground mb-1.5">
              {t('network.reminderTitleLabel')} <span className="text-danger">*</span>
            </label>
            <input
              id="reminder-title"
              value={reminderForm.title}
              onChange={(e) => setReminderForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t('network.reminderTitlePlaceholder')}
              className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reminder-type" className="block text-sm font-medium text-foreground mb-1.5">
                {t('network.reminderTypeLabel')}
              </label>
              <select
                id="reminder-type"
                value={reminderForm.type}
                onChange={(e) => setReminderForm((f) => ({ ...f, type: e.target.value as ReminderType }))}
                className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {REMINDER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`network.reminderType.${type}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reminder-date" className="block text-sm font-medium text-foreground mb-1.5">
                {t('network.reminderDateLabel')} <span className="text-danger">*</span>
              </label>
              <input
                id="reminder-date"
                type="date"
                value={reminderForm.dueDate}
                onChange={(e) => setReminderForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          {contacts.length > 0 && (
            <div>
              <label htmlFor="reminder-contact" className="block text-sm font-medium text-foreground mb-1.5">
                {t('network.reminderContactLabel')}
              </label>
              <select
                id="reminder-contact"
                value={reminderForm.relatedContactId}
                onChange={(e) => setReminderForm((f) => ({ ...f, relatedContactId: e.target.value }))}
                className="w-full px-3 py-2 min-h-11 text-sm border border-border-strong rounded-xl bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('network.reminderContactNone')}</option>
                {contacts.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                    {c.company && ` (${c.company})`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setReminderSheetOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={savingReminder} disabled={!reminderForm.title.trim() || !reminderForm.dueDate} onClick={saveReminder}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Company intelligence panel */}
      <CompanyIntelligencePanel company={intelCompany} onClose={() => setIntelCompany(null)} />
    </div>
  );
}

export default function NetworkPage() {
  return (
    <Suspense>
      <NetworkContent />
    </Suspense>
  );
}
