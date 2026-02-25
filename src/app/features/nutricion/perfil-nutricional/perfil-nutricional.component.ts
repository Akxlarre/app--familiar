import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '@core/services/auth.service';
import { NutritionProfileService } from '@core/services/nutrition-profile.service';
import { BodyLogService } from '@core/services/body-log.service';
import { NutritionCalculatorService } from '@core/services/nutrition-calculator.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  ACTIVITY_LEVEL_LABELS,
  NUTRITION_GOAL_LABELS,
  getBMICategoryLabel,
} from '@core/constants/nutrition.constants';
import type {
  NutritionProfile,
  BiologicalSex,
  ActivityLevel,
  NutritionGoal,
} from '@core/models/nutrition.model';
import type { BMICategory } from '@core/models/nutrition.model';

const SEX_OPTIONS: { label: string; value: BiologicalSex }[] = [
  { label: 'Hombre', value: 'male' },
  { label: 'Mujer', value: 'female' },
];

@Component({
  selector: 'app-perfil-nutricional',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    ToggleSwitchModule,
    TooltipModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <app-page-header
        title="Mi perfil nutricional"
        description="Datos corporales y objetivos. Los cálculos son referencias, no prescripciones médicas."
        parentHref="/app/nutricion"
        parentLabel="Nutrición"
      />

      @if (loading()) {
        <div class="h-64 rounded-xl bg-subtle animate-pulse"></div>
      } @else {
        <form
          class="rounded-xl border border-default bg-surface p-4 flex flex-col gap-4"
          (ngSubmit)="save()"
          aria-labelledby="form-title"
        >
          <h2 id="form-title" class="font-semibold text-primary">Datos corporales</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="sex" class="block text-sm font-medium text-primary mb-1">Sexo biológico</label>
              <p-select
                id="sex"
                name="sex"
                [options]="sexOptions"
                [ngModel]="formSex()"
                (ngModelChange)="formSex.set($event)"
                optionLabel="label"
                optionValue="value"
                [ariaRequired]="true"
                placeholder="Seleccionar"
                styleClass="w-full"
              />
            </div>
            <div>
              <label for="birthdate" class="block text-sm font-medium text-primary mb-1">Fecha de nacimiento</label>
              <input
                id="birthdate"
                type="date"
                [ngModel]="formBirthdate()"
                (ngModelChange)="formBirthdate.set($event)"
                name="birthdate"
                class="w-full rounded border border-default px-3 py-2"
                required
                aria-required="true"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="height" class="block text-sm font-medium text-primary mb-1">Estatura (cm)</label>
              <p-inputNumber
                id="height"
                [ngModel]="formHeight()"
                (ngModelChange)="formHeight.set($event)"
                name="height"
                [min]="100"
                [max]="250"
                [step]="1"
                suffix=" cm"
                inputStyleClass="w-full"
                [ariaRequired]="true"
              />
            </div>
            <div>
              <label for="weight" class="block text-sm font-medium text-primary mb-1">Peso actual (kg)</label>
              <p-inputNumber
                id="weight"
                [ngModel]="formWeight()"
                (ngModelChange)="formWeight.set($event)"
                name="weight"
                [min]="30"
                [max]="300"
                [step]="0.1"
                suffix=" kg"
                inputStyleClass="w-full"
                [ariaRequired]="true"
              />
              <p class="text-xs text-secondary mt-1">Se sincroniza con el peso del módulo Cuidado Físico</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="activity" class="block text-sm font-medium text-primary mb-1">Nivel de actividad</label>
              <p-select
                id="activity"
                name="activity"
                [options]="activityOptions"
                [ngModel]="formActivity()"
                (ngModelChange)="formActivity.set($event)"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar"
                styleClass="w-full"
              />
            </div>
            <div>
              <label for="goal" class="block text-sm font-medium text-primary mb-1">Objetivo</label>
              <p-select
                id="goal"
                name="goal"
                [options]="goalOptions"
                [ngModel]="formGoal()"
                (ngModelChange)="formGoal.set($event)"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar"
                styleClass="w-full"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <p-toggleSwitch [ngModel]="formManualOverride()" (ngModelChange)="formManualOverride.set($event)" name="manualOverride" />
            <label for="manualOverride" class="text-sm text-primary">Ajuste manual (no recalcular con el peso)</label>
          </div>

          <div class="rounded-lg bg-subtle/50 p-4" aria-live="polite">
            <h3 class="font-medium text-primary mb-2">Resultados calculados</h3>
            <dl class="grid grid-cols-2 gap-2 text-sm">
              <dt class="text-secondary flex items-center gap-1">
                IMC
                <button
                  type="button"
                  class="size-5 min-w-5 rounded-full border border-default bg-base-100 text-secondary text-xs font-medium inline-flex items-center justify-center hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  [pTooltip]="helpImc"
                  tooltipPosition="top"
                  aria-label="Qué es el IMC"
                >?</button>
              </dt>
              <dd class="tabular-nums font-medium">{{ results().bmi }} — {{ results().bmiCategory }}</dd>
              <dt class="text-secondary flex items-center gap-1">
                TMB
                <button
                  type="button"
                  class="size-5 min-w-5 rounded-full border border-default bg-base-100 text-secondary text-xs font-medium inline-flex items-center justify-center hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  [pTooltip]="helpTmb"
                  tooltipPosition="top"
                  aria-label="Qué es la TMB"
                >?</button>
              </dt>
              <dd class="tabular-nums">{{ results().bmr }} kcal/día</dd>
              <dt class="text-secondary flex items-center gap-1">
                TDEE
                <button
                  type="button"
                  class="size-5 min-w-5 rounded-full border border-default bg-base-100 text-secondary text-xs font-medium inline-flex items-center justify-center hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  [pTooltip]="helpTdee"
                  tooltipPosition="top"
                  aria-label="Qué es el TDEE"
                >?</button>
              </dt>
              <dd class="tabular-nums">{{ results().tdee }} kcal/día</dd>
              <dt class="text-secondary flex items-center gap-1">
                Meta calórica
                <button
                  type="button"
                  class="size-5 min-w-5 rounded-full border border-default bg-base-100 text-secondary text-xs font-medium inline-flex items-center justify-center hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  [pTooltip]="helpMetaCalorica"
                  tooltipPosition="top"
                  aria-label="Qué es la meta calórica"
                >?</button>
              </dt>
              <dd class="tabular-nums">{{ results().caloriesTarget }} kcal/día</dd>
              <dt class="text-secondary flex items-center gap-1">
                Meta proteína
                <button
                  type="button"
                  class="size-5 min-w-5 rounded-full border border-default bg-base-100 text-secondary text-xs font-medium inline-flex items-center justify-center hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  [pTooltip]="helpMetaProteina"
                  tooltipPosition="top"
                  aria-label="Qué es la meta de proteína"
                >?</button>
              </dt>
              <dd class="tabular-nums">{{ results().proteinTargetG }} g/día</dd>
              <dt class="text-secondary flex items-center gap-1">
                Rango peso saludable
                <button
                  type="button"
                  class="size-5 min-w-5 rounded-full border border-default bg-base-100 text-secondary text-xs font-medium inline-flex items-center justify-center hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  [pTooltip]="helpRangoPeso"
                  tooltipPosition="top"
                  aria-label="Qué es el rango de peso saludable"
                >?</button>
              </dt>
              <dd class="tabular-nums">{{ results().healthyMin }} – {{ results().healthyMax }} kg</dd>
            </dl>
          </div>

          <div class="flex gap-2">
            <button pButton type="submit" label="Guardar perfil" [loading]="saving()" aria-label="Guardar perfil nutricional"></button>
            <a pButton label="Cancelar" routerLink="/app/nutricion" severity="secondary"></a>
          </div>
        </form>
      }
    </div>
  `,
})
export class PerfilNutricionalComponent implements OnInit {
  private auth = inject(AuthService);
  private nutritionProfile = inject(NutritionProfileService);
  private bodyLog = inject(BodyLogService);
  private calculator = inject(NutritionCalculatorService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly existingProfile = signal<NutritionProfile | null>(null);

  formSex = signal<BiologicalSex>('male');
  formBirthdate = signal<string>('');
  formHeight = signal<number>(170);
  formWeight = signal<number>(70);
  formActivity = signal<ActivityLevel>('moderate');
  formGoal = signal<NutritionGoal>('maintenance');
  formManualOverride = signal(false);

  readonly sexOptions = SEX_OPTIONS;

  readonly helpImc =
    'Índice de Masa Corporal. Relación entre tu peso y tu estatura (peso en kg ÷ estatura en m²). Referencia de categoría: bajo peso, normal, sobrepeso u obesidad. No es un diagnóstico médico.';
  readonly helpTmb =
    'Tasa Metabólica Basal. Las calorías que tu cuerpo consume en reposo total (sin actividad). Se calcula con la fórmula Mifflin-St Jeor. Es la base para estimar cuánto debes comer.';
  readonly helpTdee =
    'Gasto energético diario total. Tu TMB multiplicada por tu nivel de actividad. Representa las calorías de mantenimiento: las que debes consumir para mantener tu peso actual.';
  readonly helpMetaCalorica =
    'Objetivo de calorías diarias según tu objetivo (déficit, mantenimiento o superávit). En déficit es menor que el TDEE; en superávit, mayor.';
  readonly helpMetaProteina =
    'Gramos de proteína al día recomendados para tu peso y objetivo. En déficit o superávit se recomienda más proteína para preservar o ganar músculo.';
  readonly helpRangoPeso =
    'Rango de peso (kg) asociado a IMC entre 18,5 y 24,9 para tu estatura. Es referencial, no prescriptivo.';

  readonly activityOptions = Object.entries(ACTIVITY_LEVEL_LABELS).map(([value, label]) => ({
    label,
    value: value as ActivityLevel,
  }));
  readonly goalOptions = Object.entries(NUTRITION_GOAL_LABELS).map(([value, label]) => ({
    label,
    value: value as NutritionGoal,
  }));

  readonly results = computed(() => {
    const sex = this.formSex();
    const birthdate = this.formBirthdate();
    const height = this.formHeight();
    const weight = this.formWeight();
    const activity = this.formActivity();
    const goal = this.formGoal();
    if (!birthdate || height <= 0 || weight <= 0) {
      return {
        bmi: '—',
        bmiCategory: '—',
        bmr: '—',
        tdee: '—',
        caloriesTarget: '—',
        proteinTargetG: '—',
        healthyMin: '—',
        healthyMax: '—',
      };
    }
    const age = this.calculator.calculateAge(birthdate);
    const bmr = this.calculator.calculateBMR(sex, weight, height, age);
    const tdee = this.calculator.calculateTDEE(bmr, activity);
    const caloriesTarget = this.calculator.calculateCalorieTarget(tdee, goal);
    const proteinTargetG = this.calculator.calculateProteinTarget(weight, goal);
    const bmi = this.calculator.calculateBMI(weight, height);
    const bmiCategory = getBMICategoryLabel(this.calculator.getBMICategory(bmi));
    const range = this.calculator.getHealthyWeightRange(height);
    return {
      bmi: bmi.toFixed(1),
      bmiCategory,
      bmr: String(bmr),
      tdee: String(tdee),
      caloriesTarget: String(caloriesTarget),
      proteinTargetG: String(proteinTargetG),
      healthyMin: String(range.minKg),
      healthyMax: String(range.maxKg),
    };
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.id) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const [profileRes, weightRes] = await Promise.all([
      this.nutritionProfile.getByProfileId(user.id),
      this.bodyLog.getLatestWeight(user.id),
    ]);
    if (profileRes.data) {
      this.existingProfile.set(profileRes.data);
      this.formSex.set(profileRes.data.sex);
      this.formBirthdate.set(profileRes.data.birthdate);
      this.formHeight.set(profileRes.data.height_cm);
      this.formWeight.set(profileRes.data.weight_kg);
      this.formActivity.set(profileRes.data.activity_level);
      this.formGoal.set(profileRes.data.goal);
      this.formManualOverride.set(profileRes.data.is_manual_override);
    } else {
      if (weightRes.data != null) this.formWeight.set(weightRes.data);
      const today = new Date();
      this.formBirthdate.set(
        new Date(today.getFullYear() - 30, today.getMonth(), today.getDate()).toISOString().slice(0, 10)
      );
    }
    this.loading.set(false);
  }

  async save(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.id || !user?.householdId) return;
    const birthdate = this.formBirthdate();
    if (!birthdate) return;
    this.saving.set(true);
    const existing = this.existingProfile();
    if (existing) {
      const age = this.calculator.calculateAge(birthdate);
      const bmr = this.calculator.calculateBMR(
        this.formSex(),
        this.formWeight(),
        this.formHeight(),
        age
      );
      const tdee = this.calculator.calculateTDEE(bmr, this.formActivity());
      const caloriesTarget = this.calculator.calculateCalorieTarget(tdee, this.formGoal());
      const proteinTargetG = this.calculator.calculateProteinTarget(
        this.formWeight(),
        this.formGoal()
      );
      const macroTargets = this.calculator.calculateMacroTargets(
        caloriesTarget,
        this.formWeight(),
        this.formGoal(),
        {
          proteinPct: existing.macro_protein_pct,
          carbsPct: existing.macro_carbs_pct,
          fatPct: existing.macro_fat_pct,
        }
      );
      const { error } = await this.nutritionProfile.update(existing.id, {
        sex: this.formSex(),
        birthdate,
        heightCm: this.formHeight(),
        weightKg: this.formWeight(),
        activityLevel: this.formActivity(),
        goal: this.formGoal(),
        caloriesTarget,
        proteinTargetG,
        carbsTargetG: macroTargets.carbsG,
        fatTargetG: macroTargets.fatG,
        isManualOverride: this.formManualOverride(),
      });
      this.saving.set(false);
      if (!error) this.load();
      return;
    }
    const { error } = await this.nutritionProfile.create({
      profileId: user.id,
      householdId: user.householdId,
      sex: this.formSex(),
      birthdate,
      heightCm: this.formHeight(),
      weightKg: this.formWeight(),
      activityLevel: this.formActivity(),
      goal: this.formGoal(),
      isManualOverride: this.formManualOverride(),
    });
    this.saving.set(false);
    if (!error) this.load();
  }
}
