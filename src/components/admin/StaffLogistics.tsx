import React from 'react';
import { motion } from 'motion/react';
import { Scissors, Clock, CalendarDays, Shield, AlertCircle, Save, ChevronRight, User, Coffee, X } from 'lucide-react';
import { StaffMember, WeeklySchedule, WorkDay, TimeRange, DateOverride } from '../../types';
import { siteConfig } from '../../config/site';
import { localeConfig } from '../../config/locale';
import { dbService } from '../../services/db';
import { cn } from '../../lib/utils';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { DUR_MODAL_ENTER } from '../../lib/motion';

export function StaffLogistics() {
  const [staff, setStaff] = React.useState<StaffMember[]>(siteConfig.staff);
  const { sections } = siteConfig;
  const { staff: config } = sections.admin;
  const t = localeConfig.admin.staffSchedule;

  const [selectedStaffId, setSelectedStaffId] = React.useState<string>(staff[0]?.id || '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [overrides, setOverrides] = React.useState<Record<string, any>>({});
  const [activeDatePanel, setActiveDatePanel] = React.useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  const selectedStaffMember = staff.find(b => b.id === selectedStaffId);

  React.useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    const data = await dbService.getStaffOverrides();
    setOverrides(data);
    // Seed dateOverrides from Firestore into local staff state on load
    setStaff(prev => prev.map(b => {
      const override = data[b.id];
      if (!override?.dateOverrides) return b;
      return { ...b, dateOverrides: override.dateOverrides as Record<string, DateOverride> };
    }));
  };

  const handleToggleDay = (day: keyof WeeklySchedule) => {
    if (!selectedStaffMember) return;
    const newSchedule = {
        ...selectedStaffMember.schedule,
        [day]: {
            ...selectedStaffMember.schedule[day],
            isOpen: !selectedStaffMember.schedule[day].isOpen
        }
    };
    updateStaffState(newSchedule, selectedStaffMember.blockedDates || []);
  };

  const handleTimeChange = (day: keyof WeeklySchedule, field: 'start' | 'end', value: string) => {
    if (!selectedStaffMember) return;
    const newSchedule = {
      ...selectedStaffMember.schedule,
      [day]: {
        ...selectedStaffMember.schedule[day],
        hours: { ...selectedStaffMember.schedule[day].hours, [field]: value }
      }
    };
    updateStaffState(newSchedule, selectedStaffMember.blockedDates || []);
  };

  const handleAddBreak = (day: keyof WeeklySchedule) => {
    if (!selectedStaffMember) return;
    const newSchedule = {
      ...selectedStaffMember.schedule,
      [day]: {
        ...selectedStaffMember.schedule[day],
        breaks: [...selectedStaffMember.schedule[day].breaks, { start: "12:00", end: "13:00", label: "Break" }]
      }
    };
    updateStaffState(newSchedule, selectedStaffMember.blockedDates || []);
  };

  const handleRemoveBreak = (day: keyof WeeklySchedule, index: number) => {
    if (!selectedStaffMember) return;
    const newSchedule = {
      ...selectedStaffMember.schedule,
      [day]: {
        ...selectedStaffMember.schedule[day],
        breaks: selectedStaffMember.schedule[day].breaks.filter((_, i) => i !== index)
      }
    };
    updateStaffState(newSchedule, selectedStaffMember.blockedDates || []);
  };

  const handleBreakChange = (day: keyof WeeklySchedule, index: number, field: 'start' | 'end', value: string) => {
    if (!selectedStaffMember) return;
    const newSchedule = {
      ...selectedStaffMember.schedule,
      [day]: {
        ...selectedStaffMember.schedule[day],
        breaks: selectedStaffMember.schedule[day].breaks.map((brk, i) => i === index ? { ...brk, [field]: value } : brk)
      }
    };
    updateStaffState(newSchedule, selectedStaffMember.blockedDates || []);
  };

  const handleToggleBlockedDate = (date: string) => {
    if (!selectedStaffMember) return;
    const currentPaths = selectedStaffMember.blockedDates || [];
    const newPaths = currentPaths.includes(date)
      ? currentPaths.filter(d => d !== date)
      : [...currentPaths, date];
    updateStaffState(selectedStaffMember.schedule, newPaths);
  };

  /** Set or clear a dateOverride for a specific date. null = remove exception. */
  const handleSetDateOverride = (dateStr: string, override: DateOverride | null) => {
    if (!selectedStaffMember) return;
    const current = { ...(selectedStaffMember.dateOverrides || {}) };
    if (override === null) {
      delete current[dateStr];
    } else {
      current[dateStr] = override;
    }
    setStaff(prev => prev.map(b => b.id === selectedStaffId ? { ...b, dateOverrides: current } : b));
    setHasUnsavedChanges(true);
  };

  const updateStaffState = (newSchedule: WeeklySchedule, newBlockedDates: string[]) => {
    setStaff(prev => prev.map(b => b.id === selectedStaffId ? { ...b, schedule: newSchedule, blockedDates: newBlockedDates } : b));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!selectedStaffMember) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await dbService.saveStaffOverride(selectedStaffId, {
        schedule: selectedStaffMember.schedule,
        blockedDates: selectedStaffMember.blockedDates || [],
        dateOverrides: selectedStaffMember.dateOverrides || {},
      });
      setHasUnsavedChanges(false);
      await fetchOverrides();
    } catch (error) {
      console.error("Failed to save staff data:", error);
      setSaveError(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Staff Selector */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="mb-6 px-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{config.title}</h3>
        <div className="space-y-2">
          {staff.map(member => (
            <button
              key={member.id}
              onClick={() => {
                setSelectedStaffId(member.id);
                setSaveError(null);
                setActiveDatePanel(null);
                setHasUnsavedChanges(false);
              }}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                selectedStaffId === member.id
                  ? "bg-accent-light/10 border-accent-light/50"
                  : "border-border bg-card transition-all duration-300 hover:border-accent-light/30 hover:shadow-md"
              )}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border transition-colors duration-300 shrink-0">
                <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xs font-black uppercase truncate", selectedStaffId === member.id ? "text-accent-light" : "text-foreground")}>
                  {member.name.split(' ')[0]}
                </p>
                <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{member.specialty}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Editor */}
      <div className="lg:col-span-3 space-y-8">
        {selectedStaffMember ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_MODAL_ENTER }}
            className="overflow-hidden rounded-[32px] border border-border bg-card/95 shadow-elevated backdrop-blur-sm transition-colors duration-300"
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/40 p-8 backdrop-blur-sm transition-colors duration-300">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-accent-light/10 rounded-2xl border border-accent-light/20">
                  <Clock className="text-accent-light" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-foreground mb-1">{config.scheduleTitle}</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.staffLabel} {selectedStaffMember.name}</p>
                </div>
              </div>
              {/* Save button with unsaved-changes indicator */}
              <div className="relative">
                {hasUnsavedChanges && !isSaving && (
                  <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-orange-400 border-2 border-card z-10" title={t.unsavedChanges} />
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  type="button"
                  className="flex items-center gap-3 rounded-xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground shadow-xl shadow-accent/10 transition-all hover:bg-accent-light hover:text-zinc-950 disabled:bg-muted disabled:text-muted-foreground"
                >
                  {isSaving ? (
                     <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{config.commitButton}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Save error banner */}
            {saveError && (
              <div className="mx-8 mt-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-xs font-bold text-red-500">{saveError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="p-8">
              <div className="space-y-4">
                {(Object.keys(selectedStaffMember.schedule) as Array<keyof WeeklySchedule>).map((day) => {
                  const dayConfig = selectedStaffMember.schedule[day];
                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        dayConfig.isOpen ? "border-border bg-muted/50 transition-colors duration-300" : "border-border bg-muted/30 opacity-50 transition-colors duration-300"
                      )}
                    >
                      <div className="flex items-center gap-6 w-1/4">
                        <button
                          onClick={() => handleToggleDay(day)}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all",
                            dayConfig.isOpen ? "bg-emerald-500/20" : "bg-muted transition-colors duration-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full transition-all",
                            dayConfig.isOpen ? "right-1 bg-emerald-500" : "left-1 bg-muted-foreground/50"
                          )} />
                        </button>
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground transition-colors duration-300 w-24">{day}</span>
                      </div>

                      <div className="flex items-center gap-8 flex-1 justify-end">
                        {dayConfig.isOpen ? (
                          <div className="space-y-4 flex-1 flex flex-col items-end">
                            <div className="flex items-center gap-6 justify-end w-full">
                                <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">{t.start}</span>
                                <input
                                    type="time"
                                    value={dayConfig.hours.start}
                                    onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                    className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none transition-colors duration-300 focus:border-accent-light/50"
                                />
                                </div>
                                <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">{t.end}</span>
                                <input
                                    type="time"
                                    value={dayConfig.hours.end}
                                    onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                    className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none transition-colors duration-300 focus:border-accent-light/50"
                                />
                                </div>
                            </div>

                            {/* Breaks */}
                            <div className="w-full pl-32">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Coffee size={12} className="text-muted-foreground" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.breaks}</span>
                                    </div>
                                    <button
                                        onClick={() => handleAddBreak(day)}
                                        className="text-[10px] font-black uppercase text-accent-light hover:text-accent-light bg-accent-light/5 px-2 py-1 rounded-md border border-accent-light/10"
                                    >
                                        {t.addBreak}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {dayConfig.breaks.map((brk, idx) => (
                                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2">
                                            <input
                                                type="time"
                                                value={brk.start}
                                                onChange={(e) => handleBreakChange(day, idx, 'start', e.target.value)}
                                                className="bg-transparent border-none text-[10px] text-muted-foreground transition-colors duration-300 outline-none w-16"
                                            />
                                            <span className="text-[10px] text-muted-foreground">{t.breakTo.toUpperCase()}</span>
                                            <input
                                                type="time"
                                                value={brk.end}
                                                onChange={(e) => handleBreakChange(day, idx, 'end', e.target.value)}
                                                className="bg-transparent border-none text-[10px] text-muted-foreground transition-colors duration-300 outline-none w-16"
                                            />
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => handleRemoveBreak(day, idx)}
                                                className="text-muted-foreground transition-colors hover:text-red-500"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {dayConfig.breaks.length === 0 && (
                                        <div className="rounded-lg border border-dashed border-border p-2 text-center text-[10px] italic text-muted-foreground transition-colors duration-300">
                                            {t.noBreaks}
                                        </div>
                                    )}
                                </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                             <AlertCircle size={14} />
                             <span className="text-[10px] font-black uppercase tracking-tighter">{t.dayOff}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Date exceptions section */}
              <div className="mt-12 space-y-6">
                <div className="p-6 bg-card transition-colors duration-300 border border-border rounded-2xl">
                    {/* Title + legend */}
                    <div className="flex items-center gap-3 mb-4">
                        <CalendarDays size={18} className="text-accent-light" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-foreground">{t.dateExceptions}</h3>
                        <div className="flex items-center gap-3 ml-auto">
                          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            {t.dayOff}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                            {t.customHours}
                          </span>
                        </div>
                    </div>

                    {/* 3-state calendar: normal / dayOff (red) / customHours (amber) */}
                    <Calendar
                      selected={activeDatePanel ? parseISO(activeDatePanel) : null}
                      onSelect={(d) => {
                        const dateStr = format(d, "yyyy-MM-dd");
                        setActiveDatePanel(prev => prev === dateStr ? null : dateStr);
                      }}
                      disabled={(d) => isBefore(startOfDay(d), startOfDay(new Date()))}
                      isDateBlocked={(d) => {
                        const dateStr = format(d, "yyyy-MM-dd");
                        const ov = selectedStaffMember.dateOverrides?.[dateStr];
                        return ov?.type === "dayOff" || !!selectedStaffMember.blockedDates?.includes(dateStr);
                      }}
                      isDateCustomHours={(d) => {
                        const dateStr = format(d, "yyyy-MM-dd");
                        return selectedStaffMember.dateOverrides?.[dateStr]?.type === "customHours";
                      }}
                      className="max-w-full border-border bg-card shadow-elevated sm:max-w-[340px]"
                    />

                    {/* Inline day panel — shown when a future date is selected */}
                    {activeDatePanel && (() => {
                      const ov = selectedStaffMember.dateOverrides?.[activeDatePanel];
                      return (
                        <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {format(parseISO(activeDatePanel), "MMM d, yyyy")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {/* No exception */}
                            <button
                              type="button"
                              onClick={() => { handleSetDateOverride(activeDatePanel, null); setActiveDatePanel(null); }}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-colors",
                                !ov
                                  ? "border-accent-light/50 bg-accent-light/10 text-accent-light"
                                  : "border-border bg-card text-muted-foreground hover:border-accent-light/30"
                              )}
                            >{t.noException}</button>
                            {/* Day off */}
                            <button
                              type="button"
                              onClick={() => handleSetDateOverride(activeDatePanel, { type: "dayOff" })}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-colors",
                                ov?.type === "dayOff"
                                  ? "border-red-500/50 bg-red-500/10 text-red-500"
                                  : "border-border bg-card text-muted-foreground hover:border-red-500/30"
                              )}
                            >{t.dayOff}</button>
                            {/* Custom hours */}
                            <button
                              type="button"
                              onClick={() => handleSetDateOverride(activeDatePanel, {
                                type: "customHours",
                                start: ov?.type === "customHours" ? ov.start : "09:00",
                                end: ov?.type === "customHours" ? ov.end : "18:00",
                              })}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-colors",
                                ov?.type === "customHours"
                                  ? "border-amber-400/50 bg-amber-400/10 text-amber-500"
                                  : "border-border bg-card text-muted-foreground hover:border-amber-400/30"
                              )}
                            >{t.customHours}</button>
                          </div>
                          {/* Time inputs for custom hours */}
                          {ov?.type === "customHours" && (
                            <div className="flex items-center gap-4 pt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">{t.start}</span>
                                <input
                                  type="time"
                                  value={ov.start}
                                  onChange={(e) => handleSetDateOverride(activeDatePanel, { type: "customHours", start: e.target.value, end: ov.end })}
                                  className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-amber-400/50"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">{t.end}</span>
                                <input
                                  type="time"
                                  value={ov.end}
                                  onChange={(e) => handleSetDateOverride(activeDatePanel, { type: "customHours", start: ov.start, end: e.target.value })}
                                  className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-amber-400/50"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <p className="mt-4 text-[10px] italic uppercase tracking-tight text-muted-foreground">* {t.dateExceptionsHint}</p>
                </div>

                <div className="p-6 bg-accent-light/[0.03] border border-accent-light/10 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <Shield className="text-accent-light/40 shrink-0" size={20} />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-accent-light/60 uppercase tracking-widest">{config.enforcementTitle}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {config.enforcementDesc}
                            </p>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex h-[400px] flex-col items-center justify-center space-y-4 text-muted-foreground">
             <User size={48} className="opacity-20" />
             <p className="text-xs font-black uppercase tracking-widest">{t.selectStaff}</p>
          </div>
        )}
      </div>
    </div>
  );
}
