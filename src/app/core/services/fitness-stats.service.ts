import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { WorkoutSessionService } from './workout-session.service';
import { BodyLogService } from './body-log.service';
import { PersonalRecordService } from './personal-record.service';

export interface MemberFitnessSummary {
  profileId: string;
  profileName: string;
  lastSessionDate: string | null;
  lastSessionRoutineName: string | null;
  lastSessionDurationSeconds: number | null;
  currentStreakDays: number;
  lastWeightKg: number | null;
  recentPrCount: number;
}

export interface FitnessDashboardStats {
  members: MemberFitnessSummary[];
  coupleStreakWeeks: number;
}

@Injectable({
  providedIn: 'root',
})
export class FitnessStatsService {
  private supabase = inject(SupabaseService);
  private workoutSessionService = inject(WorkoutSessionService);
  private bodyLogService = inject(BodyLogService);
  private personalRecordService = inject(PersonalRecordService);

  async getDashboardStats(householdId: string): Promise<{ data: FitnessDashboardStats; error: Error | null }> {
    const { data: profiles } = await this.supabase.client
      .from('profiles')
      .select('id, display_name')
      .eq('household_id', householdId);
    const members = (profiles ?? []) as { id: string; display_name: string }[];
    const summaries: MemberFitnessSummary[] = [];

    for (const p of members) {
      const [sessions, weight, streak, prs] = await Promise.all([
        this.workoutSessionService.getSessionsByProfile(p.id, { limit: 1 }),
        this.bodyLogService.getLatestWeight(p.id),
        this.getCurrentStreak(p.id),
        this.personalRecordService.getRecordsByProfile(p.id, householdId),
      ]);
      const lastSession = sessions.data[0] ?? null;
      summaries.push({
        profileId: p.id,
        profileName: p.display_name ?? 'Miembro',
        lastSessionDate: lastSession?.session_date ?? null,
        lastSessionRoutineName: lastSession?.routine?.name ?? null,
        lastSessionDurationSeconds: lastSession?.duration_seconds ?? null,
        currentStreakDays: streak,
        lastWeightKg: weight.data,
        recentPrCount: prs.data.length,
      });
    }

    const coupleStreakWeeks = await this.getCoupleStreakWeeks(householdId, members.map((m) => m.id));

    return {
      data: { members: summaries, coupleStreakWeeks },
      error: null,
    };
  }

  /** Consecutive days with at least one completed session. */
  async getCurrentStreak(profileId: string): Promise<number> {
    const { data: sessions } = await this.workoutSessionService.getSessionsByProfile(profileId, { limit: 365 });
    if (!sessions.length) return 0;
    const dates = [...new Set(sessions.map((s) => s.session_date))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let check = today;
    for (const d of dates) {
      if (d === check) {
        streak++;
        const next = new Date(check);
        next.setDate(next.getDate() - 1);
        check = next.toISOString().slice(0, 10);
      } else if (d < check) {
        break;
      }
    }
    return streak;
  }

  /** Consecutive weeks where both members had at least one session. */
  async getCoupleStreakWeeks(householdId: string, profileIds: string[]): Promise<number> {
    if (profileIds.length < 2) return 0;
    const weekStarts = new Set<string>();
    for (const pid of profileIds) {
      const { data: sessions } = await this.workoutSessionService.getSessionsByProfile(pid, { limit: 52 * 2 });
      for (const s of sessions) {
        const d = new Date(s.session_date);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        d.setUTCDate(diff);
        weekStarts.add(d.toISOString().slice(0, 10));
      }
    }
    const sorted = [...weekStarts].sort().reverse();
    let streak = 0;
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setUTCDate(now.getUTCDate() - now.getUTCDay() + (now.getUTCDay() === 0 ? -6 : 1));
    let check = thisWeekStart.toISOString().slice(0, 10);
    for (const w of sorted) {
      if (w === check) {
        streak++;
        thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);
        check = thisWeekStart.toISOString().slice(0, 10);
      } else if (w < check) break;
    }
    return streak;
  }

  async getWeeklyVolumeByExercise(
    profileId: string,
    exerciseId: string,
    weeks = 12
  ): Promise<{ data: { weekStart: string; volume: number }[]; error: Error | null }> {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - weeks * 7);
    const { data: sessions } = await this.workoutSessionService.getSessionsByProfile(profileId, {
      fromDate: from.toISOString().slice(0, 10),
      toDate: to.toISOString().slice(0, 10),
      limit: 200,
    });
    const sessionIds = sessions.map((s) => s.id);
    if (!sessionIds.length) return { data: [], error: null };

    const { data: sets } = await this.supabase.client
      .from('session_sets')
      .select('workout_session_id, weight, reps')
      .eq('exercise_id', exerciseId)
      .in('workout_session_id', sessionIds);
    const sessionDateMap = new Map(sessions.map((s) => [s.id, s.session_date]));
    const weekVolume = new Map<string, number>();
    for (const set of sets ?? []) {
      const date = sessionDateMap.get(set.workout_session_id);
      if (!date) continue;
      const d = new Date(date);
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      d.setUTCDate(diff);
      const weekKey = d.toISOString().slice(0, 10);
      const vol = (set.weight ?? 0) * (set.reps ?? 0);
      weekVolume.set(weekKey, (weekVolume.get(weekKey) ?? 0) + vol);
    }
    const result = [...weekVolume.entries()]
      .map(([weekStart, volume]) => ({ weekStart, volume }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    return { data: result, error: null };
  }
}
