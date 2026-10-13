'use client';

import * as React from 'react';
import { VaccinationSummary } from '@pawnest/shared';
import { VaccineStatusBadge } from './VaccineStatusBadge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { apiFetch } from '../../lib/api/client';
import { Plus, Trash2, Edit2, Shield, Calendar, Loader2, X } from 'lucide-react';

interface VaccinationListProps {
  petId: string;
  vaccinations: VaccinationSummary[];
  onVaccinationChanged: () => void;
}

export function VaccinationList({
  petId,
  vaccinations,
  onVaccinationChanged,
}: VaccinationListProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingVac, setEditingVac] = React.useState<VaccinationSummary | null>(null);

  // Form State
  const [name, setName] = React.useState('');
  const [administeredOn, setAdministeredOn] = React.useState(
    new Date().toISOString().split('T')[0]
  );
  const [expiresOn, setExpiresOn] = React.useState('');
  const [vetName, setVetName] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const openAddModal = () => {
    setEditingVac(null);
    setName('');
    setAdministeredOn(new Date().toISOString().split('T')[0]);
    // Default 1 year expiry
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    setExpiresOn(oneYearLater.toISOString().split('T')[0]);
    setVetName('');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (vac: VaccinationSummary) => {
    setEditingVac(vac);
    setName(vac.name);
    setAdministeredOn(vac.administeredOn.split('T')[0]);
    setExpiresOn(vac.expiresOn ? vac.expiresOn.split('T')[0] : '');
    setVetName(vac.vetName || '');
    setNotes(vac.notes || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleDelete = async (vid: string) => {
    if (!window.confirm('Are you sure you want to remove this vaccination record?')) return;

    try {
      await apiFetch(`/pets/${petId}/vaccinations/${vid}`, {
        method: 'DELETE',
      });
      onVaccinationChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vaccination');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Vaccine name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      administeredOn,
      expiresOn: expiresOn || null,
      vetName: vetName.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (editingVac) {
        await apiFetch(`/pets/${petId}/vaccinations/${editingVac.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/pets/${petId}/vaccinations`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      onVaccinationChanged();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save vaccination');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick vaccine presets for rapid addition
  const quickPresets = ['Rabies (3-Year)', 'DHPP Core', 'Bordetella', 'FVRCP (Cats)', 'Lyme Disease'];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
            Vaccination & Wellness Records
          </h3>
          <p className="text-xs text-[var(--color-charcoal-600)] mt-0.5">
            Keep verified proof of core vaccines for fast booking confirmation at boarding and salons.
          </p>
        </div>

        <Button
          onClick={openAddModal}
          variant="primary"
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Record</span>
        </Button>
      </div>

      {/* Vaccination List Cards */}
      {vaccinations.length === 0 ? (
        <div className="p-8 text-center rounded-[var(--radius-xl)] bg-[var(--color-ivory-100)] border border-dashed border-[var(--color-ivory-300)] space-y-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center mx-auto">
            <Shield className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-[var(--color-charcoal-900)]">
            No vaccination records logged yet
          </h4>
          <p className="text-xs text-[var(--color-charcoal-600)] max-w-sm mx-auto">
            Log your pet’s rabies and core vaccine boosters so our care providers can auto-verify booking readiness.
          </p>
          <Button onClick={openAddModal} variant="secondary" size="sm" className="mt-2">
            Log First Vaccine
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {vaccinations.map((vac) => {
            const adminDate = new Date(vac.administeredOn).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const expDate = vac.expiresOn
              ? new Date(vac.expiresOn).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'No expiration';

            return (
              <div
                key={vac.id}
                className="bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-lg)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-[var(--color-sage-300)] transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-serif font-semibold text-base text-[var(--color-charcoal-900)] truncate">
                      {vac.name}
                    </span>
                    <VaccineStatusBadge status={vac.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-charcoal-600)]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[var(--color-charcoal-500)]" />
                      <span>Given: {adminDate}</span>
                    </div>
                    <span>•</span>
                    <div>
                      <span>Expires: </span>
                      <span className="font-semibold text-[var(--color-charcoal-800)]">
                        {expDate}
                      </span>
                    </div>
                    {vac.vetName && (
                      <>
                        <span>•</span>
                        <span>Vet: {vac.vetName}</span>
                      </>
                    )}
                  </div>

                  {vac.notes && (
                    <p className="text-xs text-[var(--color-charcoal-500)] italic">
                      Note: {vac.notes}
                    </p>
                  )}
                </div>

                {/* Edit & Delete Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(vac)}
                    className="p-2 rounded-[var(--radius-md)] text-[var(--color-charcoal-600)] hover:bg-[var(--color-ivory-200)] transition-colors"
                    title="Edit record"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(vac.id)}
                    className="p-2 rounded-[var(--radius-md)] text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-3)] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-ivory-300)]">
              <h3 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)]">
                {editingVac ? 'Edit Vaccination' : 'Add Vaccination Record'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-full text-[var(--color-charcoal-500)] hover:bg-[var(--color-ivory-200)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-1.5">
                  Vaccine Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Rabies (3-Year)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {!editingVac && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setName(preset)}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--color-ivory-200)] text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-300)] transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-1.5">
                    Administered Date *
                  </label>
                  <Input
                    type="date"
                    value={administeredOn}
                    onChange={(e) => setAdministeredOn(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-1.5">
                    Expiration / Booster Due
                  </label>
                  <Input
                    type="date"
                    value={expiresOn}
                    onChange={(e) => setExpiresOn(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-1.5">
                  Administering Vet / Clinic
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Dr. Sarah Sterling (Veritas Clinic)"
                  value={vetName}
                  onChange={(e) => setVetName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider mb-1.5">
                  Notes / Batch Lot # (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Lot #RB-2024-X"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-ivory-300)]">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span>Save Record</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
