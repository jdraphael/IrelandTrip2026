import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Users } from 'lucide-react';
import type { FamilyMember } from '../types';

interface TravelerMenuProps {
  members?: FamilyMember[];
  onSave: (members: FamilyMember[]) => Promise<void>;
  className?: string;
  compact?: boolean;
}

const fallbackMembers: FamilyMember[] = [
  { id: 'justin', name: 'Justin', role: 'parent', avatarKey: 'dad', taskColor: '#0B5D3B' },
  { id: 'krissy', name: 'Krissy', role: 'parent', avatarKey: 'mom', taskColor: '#5F8B4C' },
  { id: 'lyla', name: 'Lyla', role: 'child', avatarKey: 'lyla', taskColor: '#D9B95B' },
  { id: 'grace', name: 'Grace', role: 'child', avatarKey: 'grace', taskColor: '#C86B25' },
  { id: 'everly', name: 'Everly', role: 'child', avatarKey: 'everly', taskColor: '#2F7D67' }
];

function toSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeMembers(members?: FamilyMember[]) {
  return members?.length ? members : fallbackMembers;
}

export function TravelerMenu({ members, onSave, className = '', compact = false }: TravelerMenuProps) {
  const sourceMembers = useMemo(() => normalizeMembers(members), [members]);
  const [draft, setDraft] = useState<FamilyMember[]>(sourceMembers);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDraft(sourceMembers);
  }, [sourceMembers]);

  const updateMember = (id: string, patch: Partial<FamilyMember>) => {
    setDraft((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  };

  const addMember = () => {
    const name = newName.trim();
    if (!name) return;
    const baseId = toSlug(name) || `traveler-${draft.length + 1}`;
    const id = draft.some((member) => member.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
    setDraft((current) => [...current, { id, name, role: 'child', avatarKey: id, taskColor: '#5F8B4C' }]);
    setNewName('');
  };

  const save = async () => {
    const cleaned = draft
      .map((member) => ({
        ...member,
        id: toSlug(member.id || member.name) || `traveler-${Date.now()}`,
        name: member.name.trim()
      }))
      .filter((member) => member.name.length > 0);
    if (cleaned.length === 0) return;
    setSaving(true);
    try {
      await onSave(cleaned);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className={`traveler-menu ${className}`} open={open}>
      <summary className={compact ? 'traveler-menu-trigger compact' : 'traveler-menu-trigger'} onClick={(event) => {
        event.preventDefault();
        setOpen((current) => !current);
      }}>
        <Users size={16} />
        <span>{sourceMembers.length} Travelers</span>
        <ChevronDown size={15} />
      </summary>
      <div className="traveler-menu-panel">
        <div className="traveler-menu-head">
          <strong>Family travelers</strong>
          <span>Assign checklist tasks by name.</span>
        </div>
        <div className="traveler-editor-list">
          {draft.map((member) => (
            <label className="traveler-editor-row" key={member.id}>
              <span className="traveler-avatar" style={{ background: member.taskColor || '#0B5D3B' }}>{member.name.charAt(0) || '?'}</span>
              <input
                value={member.name}
                onChange={(event) => updateMember(member.id, { name: event.target.value })}
                aria-label={`Traveler name for ${member.name}`}
              />
              <select
                value={member.role}
                onChange={(event) => updateMember(member.id, { role: event.target.value as FamilyMember['role'] })}
                aria-label={`Traveler role for ${member.name}`}
              >
                <option value="parent">Parent</option>
                <option value="child">Child</option>
              </select>
            </label>
          ))}
        </div>
        <div className="traveler-add-row">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Add traveler" aria-label="Add traveler name" />
          <button type="button" onClick={addMember} disabled={!newName.trim()} aria-label="Add traveler"><Plus size={15} /></button>
        </div>
        <button className="traveler-save-button" type="button" onClick={save} disabled={saving || draft.every((member, index) => member.name === sourceMembers[index]?.name && member.role === sourceMembers[index]?.role)}>
          <Check size={15} /> {saving ? 'Saving...' : 'Save travelers'}
        </button>
      </div>
    </details>
  );
}

export { fallbackMembers };
